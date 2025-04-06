package meshtastic

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"log"
	"os"
	"regexp"

	"github.com/brianshea2/meshmap.net/internal/meshtastic/generated"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"google.golang.org/protobuf/proto"
)

var DefaultKey = []byte{
	0xd4, 0xf1, 0xbb, 0x3a,
	0x20, 0x29, 0x07, 0x59,
	0xf0, 0xbc, 0xff, 0xab,
	0xcf, 0x4e, 0x69, 0x01,
}

func NewBlockCipher(key []byte) cipher.Block {
	c, err := aes.NewCipher(key)
	if err != nil {
		panic(err)
	}
	return c
}

type MQTTClient struct {
	Topics         []string
	TopicRegex     *regexp.Regexp
	Accept         func(from uint32) bool
	BlockCipher    cipher.Block
	MessageHandler func(from uint32, topic string, portNum generated.PortNum, payload []byte)
	mqtt.Client
}

func (c *MQTTClient) Connect() error {
	randomId := make([]byte, 4)
	rand.Read(randomId)
	opts := mqtt.NewClientOptions()

	opts.SetClientID(fmt.Sprintf("meshobserv-%x", randomId))

	broker := os.Getenv("MQTT_BROKER")
	if broker == "" {
		broker = "tcp://mqtt.meshtastic.org:1883"
	}
	opts.AddBroker(broker)

	username := os.Getenv("MQTT_USERNAME")
	if username == "" {
		username = "meshdev"
	}
	password := os.Getenv("MQTT_PASSWORD")
	if password == "" {
		password = "large4cats"
	}
	opts.SetUsername(username)
	opts.SetPassword(password)
	opts.SetOrderMatters(false)
	opts.SetDefaultPublishHandler(c.handleMessage)
	c.Client = mqtt.NewClient(opts)
	token := c.Client.Connect()
	<-token.Done()
	if err := token.Error(); err != nil {
		return err
	}
	log.Print("[info] connected")
	topics := make(map[string]byte)
	for _, topic := range c.Topics {
		topics[topic] = 0
	}
	token = c.SubscribeMultiple(topics, nil)
	<-token.Done()
	if err := token.Error(); err != nil {
		return err
	}
	log.Print("[info] subscribed")
	return nil
}

func (c *MQTTClient) Disconnect() {
	if c.IsConnected() {
		c.Client.Disconnect(1000)
	}
}

func (c *MQTTClient) handleMessage(_ mqtt.Client, msg mqtt.Message) {
	// filter topic
	topic := msg.Topic()
	if !c.TopicRegex.MatchString(topic) {
		return
	}
	// parse ServiceEnvelope
	var envelope generated.ServiceEnvelope
	if err := proto.Unmarshal(msg.Payload(), &envelope); err != nil {
		log.Printf("[warn] could not parse ServiceEnvelope on %v: %v", topic, err)
		return
	}
	// get MeshPacket
	packet := envelope.GetPacket()
	if packet == nil {
		log.Printf("[warn] skipping ServiceEnvelope with no MeshPacket on %v", topic)
		return
	}
	// no anonymous packets
	from := packet.GetFrom()
	if from == 0 {
		log.Printf("[warn] skipping MeshPacket from unknown on %v", topic)
		return
	}
	// check sender
	if c.Accept != nil && !c.Accept(from) {
		return
	}
	// get Data, try decoded first
	data := packet.GetDecoded()
	if data == nil {
		// data must be (probably) encrypted
		encrypted := packet.GetEncrypted()
		if encrypted == nil {
			log.Printf("[warn] skipping MeshPacket from %v with no data on %v", from, topic)
			return
		}
		// decrypt
		nonce := make([]byte, 16)
		binary.LittleEndian.PutUint32(nonce[0:], packet.GetId())
		binary.LittleEndian.PutUint32(nonce[8:], from)
		decrypted := make([]byte, len(encrypted))
		cipher.NewCTR(c.BlockCipher, nonce).XORKeyStream(decrypted, encrypted)
		// parse Data
		data = new(generated.Data)
		if err := proto.Unmarshal(decrypted, data); err != nil {
			// ignore, probably encrypted with other psk
			return
		}
	}
	c.MessageHandler(from, topic, data.GetPortnum(), data.GetPayload())
}

func init() {
	mqtt.ERROR = log.New(os.Stderr, "[error] mqtt: ", log.Flags()|log.Lmsgprefix)
	mqtt.CRITICAL = log.New(os.Stderr, "[crit] mqtt: ", log.Flags()|log.Lmsgprefix)
	mqtt.WARN = log.New(os.Stderr, "[warn] mqtt: ", log.Flags()|log.Lmsgprefix)
}

func (c *MQTTClient) PublishNodeInfo(from uint32, to uint32, topic string, longName, shortName string, hwModel generated.HardwareModel, role generated.Config_DeviceConfig_Role) error {
	// Create User protobuf for node info
	// Convert the node ID to a string for the ID field - this is critical for phone clients
	fromStr := fmt.Sprintf("%08x", from)

	topic = fmt.Sprintf("%s/!%s", topic, fromStr)
	user := &generated.User{
		// The Id field should be properly cast to match what the generated proto expects
		Id:        fromStr,
		LongName:  longName,
		ShortName: shortName,
		HwModel:   hwModel,
		Role:      role,
	}

	// Serialize the user data
	userBytes, err := proto.Marshal(user)
	if err != nil {
		return fmt.Errorf("failed to serialize user data: %v", err)
	}

	// Send the NodeInfo message
	return c.PublishMessageEncrypted(from, to, topic, generated.PortNum_NODEINFO_APP, userBytes)
}

func (c *MQTTClient) PublishPosition(from uint32, to uint32, topic string, latitudeI, longitudeI, altitude int32, precision uint32) error {
	// Create Position protobuf
	position := &generated.Position{
		LatitudeI:     &latitudeI,
		LongitudeI:    &longitudeI,
		Altitude:      &altitude,
		PrecisionBits: precision,
		Time:          uint32(binary.LittleEndian.Uint32([]byte{0x01, 0x00, 0x00, 0x00})),
		// Use default values for the rest
	}

	// Serialize the position data
	positionBytes, err := proto.Marshal(position)
	if err != nil {
		return fmt.Errorf("failed to serialize position data: %v", err)
	}

	// Send the Position message
	return c.PublishMessageEncrypted(from, to, topic, generated.PortNum_POSITION_APP, positionBytes)
}

func (c *MQTTClient) PublishMapReport(from uint32, to uint32, topic string, longName, shortName string, hwModel generated.HardwareModel, role generated.Config_DeviceConfig_Role, firmwareVersion, region, modemPreset string, hasDefaultCh bool, onlineNodes uint32, latitudeI, longitudeI, altitude int32, precision uint32) error {
	// Create MapReport protobuf
	mapReport := &generated.MapReport{
		LongName:            longName,
		ShortName:           shortName,
		HwModel:             hwModel,
		Role:                role,
		FirmwareVersion:     firmwareVersion,
		Region:              generated.Config_LoRaConfig_RegionCode(generated.Config_LoRaConfig_RegionCode_value[region]),
		ModemPreset:         generated.Config_LoRaConfig_ModemPreset(generated.Config_LoRaConfig_ModemPreset_value[modemPreset]),
		HasDefaultChannel:   hasDefaultCh,
		NumOnlineLocalNodes: onlineNodes,
		LatitudeI:           latitudeI,
		LongitudeI:          longitudeI,
		Altitude:            altitude,
		PositionPrecision:   precision,
	}

	// Serialize the map report data
	mapReportBytes, err := proto.Marshal(mapReport)
	if err != nil {
		return fmt.Errorf("failed to serialize map report data: %v", err)
	}

	// Send the MapReport message
	return c.PublishMessagePlain(from, to, topic, generated.PortNum_MAP_REPORT_APP, mapReportBytes)
}

func (c *MQTTClient) PublishMessageEncrypted(from uint32, to uint32, topic string, portNum generated.PortNum, payload []byte) error {
	data := &generated.Data{
		Portnum: portNum,
		Payload: payload,
	}

	// Serialize the data
	dataBytes, err := proto.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to serialize data: %v", err)
	}

	// Create a random message ID
	msgID := make([]byte, 4)
	if _, err := rand.Read(msgID); err != nil {
		return fmt.Errorf("failed to generate message ID: %v", err)
	}
	messageID := binary.LittleEndian.Uint32(msgID)

	// Encrypt the data with AES-256
	nonce := make([]byte, 16)
	binary.LittleEndian.PutUint32(nonce[0:], messageID)
	binary.LittleEndian.PutUint32(nonce[8:], from)
	encrypted := make([]byte, len(dataBytes))
	cipher.NewCTR(c.BlockCipher, nonce).XORKeyStream(encrypted, dataBytes)

	// Create MeshPacket with the encrypted data in the PayloadVariant
	packet := &generated.MeshPacket{
		From: from,
		To:   to,
		Id:   messageID,
		PayloadVariant: &generated.MeshPacket_Encrypted{
			Encrypted: encrypted,
		},
		HopLimit: 3,
	}

	// Create ServiceEnvelope
	envelope := &generated.ServiceEnvelope{
		Packet: packet,
	}

	// Serialize the envelope
	envelopeBytes, err := proto.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("failed to serialize envelope: %v", err)
	}

	// Publish the message
	token := c.Client.Publish(topic, 0, false, envelopeBytes)
	<-token.Done()
	if err := token.Error(); err != nil {
		return fmt.Errorf("failed to publish message: %v", err)
	}

	log.Printf("[info] published encrypted message to %s", topic)
	return nil
}

func (c *MQTTClient) PublishMessagePlain(from uint32, to uint32, topic string, portNum generated.PortNum, payload []byte) error {
	// Create Data protobuf
	data := &generated.Data{
		Portnum: portNum,
		Payload: payload,
	}

	// Create a random message ID
	msgID := make([]byte, 4)
	if _, err := rand.Read(msgID); err != nil {
		return fmt.Errorf("failed to generate message ID: %v", err)
	}
	messageID := binary.LittleEndian.Uint32(msgID)

	// Create MeshPacket with the plain data in the PayloadVariant
	packet := &generated.MeshPacket{
		From: from,
		To:   to,
		Id:   messageID,
		PayloadVariant: &generated.MeshPacket_Decoded{
			Decoded: data,
		},
		ViaMqtt: true,
	}

	// Create ServiceEnvelope
	envelope := &generated.ServiceEnvelope{
		Packet: packet,
	}

	// Serialize the envelope
	envelopeBytes, err := proto.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("failed to serialize envelope: %v", err)
	}

	// Publish the message
	token := c.Client.Publish(topic, 0, false, envelopeBytes)
	<-token.Done()
	if err := token.Error(); err != nil {
		return fmt.Errorf("failed to publish message: %v", err)
	}

	log.Printf("[info] published plain message to %s", topic)
	return nil
}
