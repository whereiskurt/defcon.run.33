#include <arpa/inet.h>
#include <pb_decode.h>
#include <pb_encode.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>
#include "meshtastic_inspector.pb.h"
#include "mosquitto_broker.h"
#include "mosquitto_plugin.h"
#include "mosquitto.h"
#include "mqtt_protocol.h"

#define INSPECTOR_HOST "127.0.0.1"
#define INSPECTOR_PORT 50051
#define MAX_BUFFER 1024

#define UNUSED(A) (void)(A)

static mosquitto_plugin_id_t *mosq_pid = NULL;

int callback_count = 0;
static int callback_message(int event, void *event_data, void *userdata)
{
	struct mosquitto_evt_message *ed = event_data;

	UNUSED(event);
	UNUSED(userdata);

	callback_count++;
    if (callback_count % 10 == 0 || callback_count < 9) {
        fprintf(stderr, "callback called (%d)\n", callback_count);
    }

	return MOSQ_ERR_SUCCESS;
}

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

static int send_packet_to_inspector(meshtasticplugin_PacketRequest *request, meshtasticplugin_PacketResponse *response)
{
    
    int sock;
    struct sockaddr_in server;
    uint8_t buffer[MAX_BUFFER];
    pb_ostream_t ostream;
    pb_istream_t istream;
    int sent_bytes, recv_bytes;

    fprintf(stdout, "send_packet_to_inspector called\n");
    fprintf(stdout, "send_packet_to_inspector called\n");

    /* Create socket */
    sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock == -1) {
        perror("socket creation failed");
        return -1;
    }

    server.sin_addr.s_addr = inet_addr(INSPECTOR_HOST);
    server.sin_family = AF_INET;
    server.sin_port = htons(INSPECTOR_PORT);

    /* Connect to Inspector server */
    if (connect(sock, (struct sockaddr *)&server, sizeof(server)) < 0) {
        perror("connect failed");
        close(sock);
        return -1;
    }

    /* Encode PacketRequest */
    ostream = pb_ostream_from_buffer(buffer, sizeof(buffer));
    if (!pb_encode(&ostream, meshtasticplugin_PacketRequest_fields, request)) {
        fprintf(stderr, "Encoding failed: %s\n", PB_GET_ERROR(&ostream));
        close(sock);
        return -1;
    }

    sent_bytes = send(sock, buffer, ostream.bytes_written, 0);
    if (sent_bytes <= 0) {
        perror("send failed");
        close(sock);
        return -1;
    }

    /* Receive PacketResponse */
    recv_bytes = recv(sock, buffer, sizeof(buffer), 0);
    if (recv_bytes <= 0) {
        perror("recv failed");
        close(sock);
        return -1;
    }

    istream = pb_istream_from_buffer(buffer, recv_bytes);
    if (!pb_decode(&istream, meshtasticplugin_PacketResponse_fields, response)) {
        fprintf(stderr, "Decoding failed: %s\n", PB_GET_ERROR(&istream));
        close(sock);
        return -1;
    }

    close(sock);
    return 0;
}
