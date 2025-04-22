#include <arpa/inet.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>
#include "mosquitto_plugin.h"
#include "mosquitto.h"
#include "mqtt_protocol.h"
// This is protobuf generated code for meshtastic_inspector.proto
#include "meshtastic_inspector.pb.h"
// These are the nanopb generated headers
#include <pb_decode.h>
#include <pb_encode.h>

#define MAX_BUFFER 2048

int callback_count = 0;

const char *get_inspector_host()
{
    const char *host = getenv("INSPECTOR_HOST");
    return host ? host : "127.0.0.1";
}
int get_inspector_port()
{
    const char *port_str = getenv("INSPECTOR_PORT");
    return port_str ? atoi(port_str) : 50051;
}

#define UNUSED(A) (void)(A)

static mosquitto_plugin_id_t *mosq_pid = NULL;

bool encode_pb_string(pb_ostream_t *stream, const pb_field_t *field, void *const *arg)
{
    const char *str = (const char *)(*arg);
    size_t len = strlen(str);

    if (!pb_encode_tag_for_field(stream, field))
        return false;

    return pb_encode_string(stream, (const pb_byte_t *)str, len);
}

static int send_to_inspector(meshtasticplugin_PacketRequest *request, meshtasticplugin_PacketResponse *response)
{
    int sock;
    struct sockaddr_in server;
    uint8_t buffer[MAX_BUFFER];
    pb_ostream_t ostream;
    pb_istream_t istream;
    int sent_bytes, recv_bytes;

    sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock == -1)
    {
        perror("socket creation failed");
        return -1;
    }

    const char *inspector_host = get_inspector_host();
    int inspector_port = get_inspector_port();
    // fprintf(stderr, "Connecting to inspector at %s:%d\n", inspector_host, inspector_port);

    server.sin_addr.s_addr = inet_addr(inspector_host);
    server.sin_family = AF_INET;
    server.sin_port = htons(inspector_port);

    /* Connect to Inspector server */
    if (connect(sock, (struct sockaddr *)&server, sizeof(server)) < 0)
    {
        perror("connect failed");
        close(sock);
        return -1;
    }
    // fprintf(stderr, "Connection established to inspector server\n");

    ostream = pb_ostream_from_buffer(buffer, sizeof(buffer));
    if (!pb_encode(&ostream, meshtasticplugin_PacketRequest_fields, request))
    {
        fprintf(stderr, "error: encoding failed, will not send to protobuf server: %d: %s\n", callback_count, PB_GET_ERROR(&ostream));
        close(sock);
        return -1;
    }
    // fprintf(stderr, "Request encoded successfully, %zu bytes\n", ostream.bytes_written);

    sent_bytes = send(sock, buffer, ostream.bytes_written, 0);
    if (sent_bytes <= 0)
    {
        perror("send failed");
        close(sock);
        return -1;
    }
    // fprintf(stderr, "Sent %d bytes to inspector server\n", sent_bytes);

    recv_bytes = recv(sock, buffer, sizeof(buffer), 0);
    if (recv_bytes <= 0)
    {
        perror("recv failed");
        close(sock);
        return -1;
    }
    // fprintf(stderr, "Received %d bytes from inspector server\n", recv_bytes);

    istream = pb_istream_from_buffer(buffer, recv_bytes);
    if (!pb_decode(&istream, meshtasticplugin_PacketResponse_fields, response))
    {
        fprintf(stderr, "error: decoding payload from protobuf server: %d: %s\n", callback_count, PB_GET_ERROR(&istream));
        close(sock);
        return -1;
    }

    close(sock);
    return 0;
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

    req.payload.funcs.encode = &encode_pb_string;
    req.payload.arg = msg->payload;

    req.topic.funcs.encode = &encode_pb_string;
    req.topic.arg = (void *)msg->topic;

    req.username.funcs.encode = &encode_pb_string;
    req.username.arg = (void *)mosquitto_client_username(msg->client);

    req.client_id.funcs.encode = &encode_pb_string;
    req.client_id.arg = (void *)mosquitto_client_id(msg->client);

    req.ip_address.funcs.encode = &encode_pb_string;
    req.ip_address.arg = (void *)mosquitto_client_address(msg->client);

    req.timestamp = (int64_t)time(NULL);

    int recvsize = send_to_inspector(&req, &res);
    if (recvsize <= 0)
    {
        if (callback_count % 10 == 0 || callback_count < 9)
        {
            fprintf(stderr, "error: plugin failed: allowing publish.\n");
        }
        return MOSQ_ERR_SUCCESS;
    }

    if (res.shouldBlock)
    {
        fprintf(stderr, "BLOCK:%d:%s:%s:%s\n", callback_count, msg->username, msg->topic, (char *)res.blockReason.arg);
        return MOSQ_ERR_PLUGIN_DEFER;
    }

    // if (callback_count % 10 == 0 || callback_count < 9)
    // {
    //     fprintf(stderr, "ALLOWED: Packet sent successfully to inspector and allowed.\n");
    // }

    msg->payload = res.payload.arg;
    msg->payloadlen = recvsize;

    return MOSQ_ERR_SUCCESS;
}

int mosquitto_plugin_version(int supported_version_count, const int *supported_versions)
{
    int i;
    printf("mosquitto_plugin_version called\n");

    for (i = 0; i < supported_version_count; i++)
    {
        if (supported_versions[i] == 5)
        {
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