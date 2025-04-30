#include <arpa/inet.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <netdb.h>
#include <time.h>
#include <unistd.h>
#include "mosquitto_plugin.h"
#include "mosquitto.h"
#include "mqtt_protocol.h"
//This is protobuf generated code for meshtastic_inspector.proto
#include "meshtastic_inspector.pb.h"
//These are the nanopb generated headers
#include <pb_decode.h>
#include <pb_encode.h>

#define MAX_BUFFER 2048
#define MAX_STRING_LENGTH 256

int callback_count = 0;
// Buffer to hold the block reason string
char block_reason_buffer[MAX_STRING_LENGTH];

const char* get_inspector_host() {
    const char* host = getenv("INSPECTOR_HOST");
    return host ? host : "127.0.0.1";
}

int get_inspector_port() {
    const char* port_str = getenv("INSPECTOR_PORT");
    return port_str ? atoi(port_str) : 50051;
}

#define UNUSED(A) (void)(A)

static mosquitto_plugin_id_t *mosq_pid = NULL;

bool encode_callback_string(pb_ostream_t *stream, const pb_field_t *field, void * const *arg)
{
    const char *str = (const char *)(*arg);
    size_t len = strlen(str);

    if (!pb_encode_tag_for_field(stream, field))
        return false;

    return pb_encode_string(stream, (const pb_byte_t *)str, len);
}

bool decode_callback_string(pb_istream_t *stream, const pb_field_t *field, void **arg)
{
    char *buffer = (char *)(*arg);
    size_t max_length = MAX_STRING_LENGTH - 1; // Leave space for null terminator

    size_t len = stream->bytes_left;
    if (len > max_length)
        len = max_length;
    
    if (!pb_read(stream, (pb_byte_t*)buffer, len))
    {
        fprintf(stderr, "pb_read failed for string\n");
        return false;
    }
    
    buffer[len] = '\0'; // Null terminate
    return true;
}

static int connect_to_inspector(const char* inspector_host, int inspector_port) {
    struct addrinfo hints, *res, *p;
    int sock = -1;
    
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_UNSPEC;    // Allow IPv4 or IPv6
    hints.ai_socktype = SOCK_STREAM;

    char port_str[6];
    snprintf(port_str, sizeof(port_str), "%d", inspector_port);

    if (getaddrinfo(inspector_host, port_str, &hints, &res) != 0) {
        perror("getaddrinfo failed");
        return -1;
    }

    // Try each address until we successfully connect
    for (p = res; p != NULL; p = p->ai_next) {
        sock = socket(p->ai_family, p->ai_socktype, p->ai_protocol);
        if (sock == -1) {
            continue;
        }

        if (connect(sock, p->ai_addr, p->ai_addrlen) == 0) {
            break; // Success
        }

        close(sock);
        sock = -1;
    }

    freeaddrinfo(res);
    
    if (sock == -1) {
        perror("connect failed");
    }
    
    return sock;
}

static int encode_and_send_request(int sock, meshtasticplugin_PacketRequest *request) {
    uint8_t buffer[MAX_BUFFER];
    pb_ostream_t ostream;
    int sent_bytes;
    
    ostream = pb_ostream_from_buffer(buffer, sizeof(buffer));
    if (!pb_encode(&ostream, meshtasticplugin_PacketRequest_fields, request)) {
        fprintf(stderr, "Encoding failed: %d: %s\n", callback_count, PB_GET_ERROR(&ostream));
        return -1;
    }

    sent_bytes = send(sock, buffer, ostream.bytes_written, 0);
    if (sent_bytes <= 0) {
        perror("send failed");
        return -1;
    }
    
    return sent_bytes;
}

static int receive_and_decode_response(int sock, meshtasticplugin_PacketResponse *response) {
    uint8_t buffer[MAX_BUFFER];
    pb_istream_t istream;
    int recv_bytes;
    
    // Set up the block reason callback
    response->blockReason.funcs.decode = &decode_callback_string;
    response->blockReason.arg = block_reason_buffer;
    
    recv_bytes = recv(sock, buffer, sizeof(buffer), 0);
    if (recv_bytes <= 0) {
        perror("recv failed");
        return -1;
    }
    
    istream = pb_istream_from_buffer(buffer, recv_bytes);
    if (!pb_decode(&istream, meshtasticplugin_PacketResponse_fields, response)) {
        fprintf(stderr, "Decoding failed: %d: %s\n", callback_count, PB_GET_ERROR(&istream));
        return -1;
    }
    
    return recv_bytes;
}

static int send_packet_to_inspector(meshtasticplugin_PacketRequest *request, meshtasticplugin_PacketResponse *response)
{
    int sock = -1;
    int result = -1;

    // Initialize block reason buffer
    memset(block_reason_buffer, 0, MAX_STRING_LENGTH);

    const char* inspector_host = get_inspector_host();
    int inspector_port = get_inspector_port();

    // Connect to the inspector server
    sock = connect_to_inspector(inspector_host, inspector_port);
    if (sock < 0) {
        return -1;
    }

    // Encode and send the request
    if (encode_and_send_request(sock, request) < 0) {
        close(sock);
        return -1;
    }

    // Receive and decode the response
    result = receive_and_decode_response(sock, response);
    
    // Log the response
    if (result > 0) {
        if (response->shouldBlock) {
            fprintf(stderr, "Inspector response: BLOCK - Reason: %s\n", block_reason_buffer);
        } else {
            fprintf(stderr, "Inspector response: ALLOW\n");
        }
    }

    close(sock);
    return result;
}

static int callback_message(int event, void *event_data, void *userdata)
{
	struct mosquitto_evt_message *msg = event_data;

	callback_count++;
    // if (callback_count % 10 == 0 || callback_count < 9) {
    //     fprintf(stderr, "callback called (%d)\n", callback_count);
    // }

    meshtasticplugin_PacketRequest req = meshtasticplugin_PacketRequest_init_zero;
    meshtasticplugin_PacketResponse res = meshtasticplugin_PacketResponse_init_zero;

    req.payload.funcs.encode = &encode_callback_string;
    req.payload.arg = msg->payload;

    req.topic.funcs.encode = &encode_callback_string;
    req.topic.arg = (void*) msg->topic;

    req.username.funcs.encode = &encode_callback_string;
    req.username.arg = (void*) mosquitto_client_username(msg->client);

    req.client_id.funcs.encode = &encode_callback_string;
    req.client_id.arg = (void*) mosquitto_client_id(msg->client);

    req.ip_address.funcs.encode = &encode_callback_string;
    req.ip_address.arg = (void*) mosquitto_client_address(msg->client);

    req.timestamp = (int64_t)time(NULL);

    int recvsize = send_packet_to_inspector(&req, &res);
    if (recvsize <= 0) {
        if (callback_count % 10 == 0 || callback_count < 9) {
            fprintf(stderr, "Failed to contact inspector, allowing publish.\n");
        }
        return MOSQ_ERR_SUCCESS;
    }

    if (res.shouldBlock) {
        fprintf(stderr, "BLOCK: Blocking publish: %d: %s\n", callback_count, block_reason_buffer);
        return MOSQ_ERR_PLUGIN_DEFER;
    }

    if (callback_count % 10 == 0 || callback_count < 9) {
        fprintf(stderr, "ALLOWED: Packet sent successfully to inspector and allowed.\n");
    }


    //TODO: Use example to copy over the payload
    // msg->payload = res.payload.arg;
    // msg->payloadlen = recvsize;

	return MOSQ_ERR_SUCCESS;
}

//This is taken from the mosquitto plugin example: https://github.com/eclipse-mosquitto/mosquitto/blob/master/plugins/payload-modification/mosquitto_payload_modification.c
int mosquitto_plugin_version(int supported_version_count, const int *supported_versions)
{
	int i;
    printf("mosquitto_plugin_version called\n");

	for(i=0; i<supported_version_count; i++){
		if(supported_versions[i] == 5){
			return 5;
		}
	}
	return -1;
}
int mosquitto_plugin_init(mosquitto_plugin_id_t *identifier, void **user_data, struct mosquitto_opt *opts, int opt_count)
{
	UNUSED(user_data);
	UNUSED(opts);
	UNUSED(opt_count);
    fprintf(stderr, "mosquitto_plugin_init called\n");

	mosq_pid = identifier;
	return mosquitto_callback_register(mosq_pid, MOSQ_EVT_MESSAGE, callback_message, NULL, NULL);
}
int mosquitto_plugin_cleanup(void *user_data, struct mosquitto_opt *opts, int opt_count)
{
	UNUSED(user_data);
	UNUSED(opts);
	UNUSED(opt_count);
    fprintf(stderr, "mosquitto_plugin_cleanup called\n");

	return mosquitto_callback_unregister(mosq_pid, MOSQ_EVT_MESSAGE, callback_message, NULL);
}