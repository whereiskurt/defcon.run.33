// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.36.5
// 	protoc        v3.21.12
// source: meshtastic/deviceonly.proto

package generated

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	reflect "reflect"
	sync "sync"
	unsafe "unsafe"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

// Position with static location information only for NodeDBLite
type PositionLite struct {
	state protoimpl.MessageState `protogen:"open.v1"`
	// The new preferred location encoding, multiply by 1e-7 to get degrees
	// in floating point
	LatitudeI int32 `protobuf:"fixed32,1,opt,name=latitude_i,json=latitudeI,proto3" json:"latitude_i,omitempty"`
	// TODO: REPLACE
	LongitudeI int32 `protobuf:"fixed32,2,opt,name=longitude_i,json=longitudeI,proto3" json:"longitude_i,omitempty"`
	// In meters above MSL (but see issue #359)
	Altitude int32 `protobuf:"varint,3,opt,name=altitude,proto3" json:"altitude,omitempty"`
	// This is usually not sent over the mesh (to save space), but it is sent
	// from the phone so that the local device can set its RTC If it is sent over
	// the mesh (because there are devices on the mesh without GPS), it will only
	// be sent by devices which has a hardware GPS clock.
	// seconds since 1970
	Time uint32 `protobuf:"fixed32,4,opt,name=time,proto3" json:"time,omitempty"`
	// TODO: REPLACE
	LocationSource Position_LocSource `protobuf:"varint,5,opt,name=location_source,json=locationSource,proto3,enum=meshtastic.Position_LocSource" json:"location_source,omitempty"`
	unknownFields  protoimpl.UnknownFields
	sizeCache      protoimpl.SizeCache
}

func (x *PositionLite) Reset() {
	*x = PositionLite{}
	mi := &file_meshtastic_deviceonly_proto_msgTypes[0]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *PositionLite) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*PositionLite) ProtoMessage() {}

func (x *PositionLite) ProtoReflect() protoreflect.Message {
	mi := &file_meshtastic_deviceonly_proto_msgTypes[0]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use PositionLite.ProtoReflect.Descriptor instead.
func (*PositionLite) Descriptor() ([]byte, []int) {
	return file_meshtastic_deviceonly_proto_rawDescGZIP(), []int{0}
}

func (x *PositionLite) GetLatitudeI() int32 {
	if x != nil {
		return x.LatitudeI
	}
	return 0
}

func (x *PositionLite) GetLongitudeI() int32 {
	if x != nil {
		return x.LongitudeI
	}
	return 0
}

func (x *PositionLite) GetAltitude() int32 {
	if x != nil {
		return x.Altitude
	}
	return 0
}

func (x *PositionLite) GetTime() uint32 {
	if x != nil {
		return x.Time
	}
	return 0
}

func (x *PositionLite) GetLocationSource() Position_LocSource {
	if x != nil {
		return x.LocationSource
	}
	return Position_LOC_UNSET
}

type UserLite struct {
	state protoimpl.MessageState `protogen:"open.v1"`
	// This is the addr of the radio.
	//
	// Deprecated: Marked as deprecated in meshtastic/deviceonly.proto.
	Macaddr []byte `protobuf:"bytes,1,opt,name=macaddr,proto3" json:"macaddr,omitempty"`
	// A full name for this user, i.e. "Kevin Hester"
	LongName string `protobuf:"bytes,2,opt,name=long_name,json=longName,proto3" json:"long_name,omitempty"`
	// A VERY short name, ideally two characters.
	// Suitable for a tiny OLED screen
	ShortName string `protobuf:"bytes,3,opt,name=short_name,json=shortName,proto3" json:"short_name,omitempty"`
	// TBEAM, HELTEC, etc...
	// Starting in 1.2.11 moved to hw_model enum in the NodeInfo object.
	// Apps will still need the string here for older builds
	// (so OTA update can find the right image), but if the enum is available it will be used instead.
	HwModel HardwareModel `protobuf:"varint,4,opt,name=hw_model,json=hwModel,proto3,enum=meshtastic.HardwareModel" json:"hw_model,omitempty"`
	// In some regions Ham radio operators have different bandwidth limitations than others.
	// If this user is a licensed operator, set this flag.
	// Also, "long_name" should be their licence number.
	IsLicensed bool `protobuf:"varint,5,opt,name=is_licensed,json=isLicensed,proto3" json:"is_licensed,omitempty"`
	// Indicates that the user's role in the mesh
	Role Config_DeviceConfig_Role `protobuf:"varint,6,opt,name=role,proto3,enum=meshtastic.Config_DeviceConfig_Role" json:"role,omitempty"`
	// The public key of the user's device.
	// This is sent out to other nodes on the mesh to allow them to compute a shared secret key.
	PublicKey     []byte `protobuf:"bytes,7,opt,name=public_key,json=publicKey,proto3" json:"public_key,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *UserLite) Reset() {
	*x = UserLite{}
	mi := &file_meshtastic_deviceonly_proto_msgTypes[1]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *UserLite) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*UserLite) ProtoMessage() {}

func (x *UserLite) ProtoReflect() protoreflect.Message {
	mi := &file_meshtastic_deviceonly_proto_msgTypes[1]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use UserLite.ProtoReflect.Descriptor instead.
func (*UserLite) Descriptor() ([]byte, []int) {
	return file_meshtastic_deviceonly_proto_rawDescGZIP(), []int{1}
}

// Deprecated: Marked as deprecated in meshtastic/deviceonly.proto.
func (x *UserLite) GetMacaddr() []byte {
	if x != nil {
		return x.Macaddr
	}
	return nil
}

func (x *UserLite) GetLongName() string {
	if x != nil {
		return x.LongName
	}
	return ""
}

func (x *UserLite) GetShortName() string {
	if x != nil {
		return x.ShortName
	}
	return ""
}

func (x *UserLite) GetHwModel() HardwareModel {
	if x != nil {
		return x.HwModel
	}
	return HardwareModel_UNSET
}

func (x *UserLite) GetIsLicensed() bool {
	if x != nil {
		return x.IsLicensed
	}
	return false
}

func (x *UserLite) GetRole() Config_DeviceConfig_Role {
	if x != nil {
		return x.Role
	}
	return Config_DeviceConfig_CLIENT
}

func (x *UserLite) GetPublicKey() []byte {
	if x != nil {
		return x.PublicKey
	}
	return nil
}

type NodeInfoLite struct {
	state protoimpl.MessageState `protogen:"open.v1"`
	// The node number
	Num uint32 `protobuf:"varint,1,opt,name=num,proto3" json:"num,omitempty"`
	// The user info for this node
	User *UserLite `protobuf:"bytes,2,opt,name=user,proto3" json:"user,omitempty"`
	// This position data. Note: before 1.2.14 we would also store the last time we've heard from this node in position.time, that is no longer true.
	// Position.time now indicates the last time we received a POSITION from that node.
	Position *PositionLite `protobuf:"bytes,3,opt,name=position,proto3" json:"position,omitempty"`
	// Returns the Signal-to-noise ratio (SNR) of the last received message,
	// as measured by the receiver. Return SNR of the last received message in dB
	Snr float32 `protobuf:"fixed32,4,opt,name=snr,proto3" json:"snr,omitempty"`
	// Set to indicate the last time we received a packet from this node
	LastHeard uint32 `protobuf:"fixed32,5,opt,name=last_heard,json=lastHeard,proto3" json:"last_heard,omitempty"`
	// The latest device metrics for the node.
	DeviceMetrics *DeviceMetrics `protobuf:"bytes,6,opt,name=device_metrics,json=deviceMetrics,proto3" json:"device_metrics,omitempty"`
	// local channel index we heard that node on. Only populated if its not the default channel.
	Channel uint32 `protobuf:"varint,7,opt,name=channel,proto3" json:"channel,omitempty"`
	// True if we witnessed the node over MQTT instead of LoRA transport
	ViaMqtt bool `protobuf:"varint,8,opt,name=via_mqtt,json=viaMqtt,proto3" json:"via_mqtt,omitempty"`
	// Number of hops away from us this node is (0 if direct neighbor)
	HopsAway *uint32 `protobuf:"varint,9,opt,name=hops_away,json=hopsAway,proto3,oneof" json:"hops_away,omitempty"`
	// True if node is in our favorites list
	// Persists between NodeDB internal clean ups
	IsFavorite bool `protobuf:"varint,10,opt,name=is_favorite,json=isFavorite,proto3" json:"is_favorite,omitempty"`
	// True if node is in our ignored list
	// Persists between NodeDB internal clean ups
	IsIgnored bool `protobuf:"varint,11,opt,name=is_ignored,json=isIgnored,proto3" json:"is_ignored,omitempty"`
	// Last byte of the node number of the node that should be used as the next hop to reach this node.
	NextHop       uint32 `protobuf:"varint,12,opt,name=next_hop,json=nextHop,proto3" json:"next_hop,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *NodeInfoLite) Reset() {
	*x = NodeInfoLite{}
	mi := &file_meshtastic_deviceonly_proto_msgTypes[2]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *NodeInfoLite) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*NodeInfoLite) ProtoMessage() {}

func (x *NodeInfoLite) ProtoReflect() protoreflect.Message {
	mi := &file_meshtastic_deviceonly_proto_msgTypes[2]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use NodeInfoLite.ProtoReflect.Descriptor instead.
func (*NodeInfoLite) Descriptor() ([]byte, []int) {
	return file_meshtastic_deviceonly_proto_rawDescGZIP(), []int{2}
}

func (x *NodeInfoLite) GetNum() uint32 {
	if x != nil {
		return x.Num
	}
	return 0
}

func (x *NodeInfoLite) GetUser() *UserLite {
	if x != nil {
		return x.User
	}
	return nil
}

func (x *NodeInfoLite) GetPosition() *PositionLite {
	if x != nil {
		return x.Position
	}
	return nil
}

func (x *NodeInfoLite) GetSnr() float32 {
	if x != nil {
		return x.Snr
	}
	return 0
}

func (x *NodeInfoLite) GetLastHeard() uint32 {
	if x != nil {
		return x.LastHeard
	}
	return 0
}

func (x *NodeInfoLite) GetDeviceMetrics() *DeviceMetrics {
	if x != nil {
		return x.DeviceMetrics
	}
	return nil
}

func (x *NodeInfoLite) GetChannel() uint32 {
	if x != nil {
		return x.Channel
	}
	return 0
}

func (x *NodeInfoLite) GetViaMqtt() bool {
	if x != nil {
		return x.ViaMqtt
	}
	return false
}

func (x *NodeInfoLite) GetHopsAway() uint32 {
	if x != nil && x.HopsAway != nil {
		return *x.HopsAway
	}
	return 0
}

func (x *NodeInfoLite) GetIsFavorite() bool {
	if x != nil {
		return x.IsFavorite
	}
	return false
}

func (x *NodeInfoLite) GetIsIgnored() bool {
	if x != nil {
		return x.IsIgnored
	}
	return false
}

func (x *NodeInfoLite) GetNextHop() uint32 {
	if x != nil {
		return x.NextHop
	}
	return 0
}

// This message is never sent over the wire, but it is used for serializing DB
// state to flash in the device code
// FIXME, since we write this each time we enter deep sleep (and have infinite
// flash) it would be better to use some sort of append only data structure for
// the receive queue and use the preferences store for the other stuff
type DeviceState struct {
	state protoimpl.MessageState `protogen:"open.v1"`
	// Read only settings/info about this node
	MyNode *MyNodeInfo `protobuf:"bytes,2,opt,name=my_node,json=myNode,proto3" json:"my_node,omitempty"`
	// My owner info
	Owner *User `protobuf:"bytes,3,opt,name=owner,proto3" json:"owner,omitempty"`
	// Received packets saved for delivery to the phone
	ReceiveQueue []*MeshPacket `protobuf:"bytes,5,rep,name=receive_queue,json=receiveQueue,proto3" json:"receive_queue,omitempty"`
	// A version integer used to invalidate old save files when we make
	// incompatible changes This integer is set at build time and is private to
	// NodeDB.cpp in the device code.
	Version uint32 `protobuf:"varint,8,opt,name=version,proto3" json:"version,omitempty"`
	// We keep the last received text message (only) stored in the device flash,
	// so we can show it on the screen.
	// Might be null
	RxTextMessage *MeshPacket `protobuf:"bytes,7,opt,name=rx_text_message,json=rxTextMessage,proto3" json:"rx_text_message,omitempty"`
	// Used only during development.
	// Indicates developer is testing and changes should never be saved to flash.
	// Deprecated in 2.3.1
	//
	// Deprecated: Marked as deprecated in meshtastic/deviceonly.proto.
	NoSave bool `protobuf:"varint,9,opt,name=no_save,json=noSave,proto3" json:"no_save,omitempty"`
	// Some GPS receivers seem to have bogus settings from the factory, so we always do one factory reset.
	DidGpsReset bool `protobuf:"varint,11,opt,name=did_gps_reset,json=didGpsReset,proto3" json:"did_gps_reset,omitempty"`
	// We keep the last received waypoint stored in the device flash,
	// so we can show it on the screen.
	// Might be null
	RxWaypoint *MeshPacket `protobuf:"bytes,12,opt,name=rx_waypoint,json=rxWaypoint,proto3" json:"rx_waypoint,omitempty"`
	// The mesh's nodes with their available gpio pins for RemoteHardware module
	NodeRemoteHardwarePins []*NodeRemoteHardwarePin `protobuf:"bytes,13,rep,name=node_remote_hardware_pins,json=nodeRemoteHardwarePins,proto3" json:"node_remote_hardware_pins,omitempty"`
	// New lite version of NodeDB to decrease memory footprint
	NodeDbLite    []*NodeInfoLite `protobuf:"bytes,14,rep,name=node_db_lite,json=nodeDbLite,proto3" json:"node_db_lite,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *DeviceState) Reset() {
	*x = DeviceState{}
	mi := &file_meshtastic_deviceonly_proto_msgTypes[3]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *DeviceState) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*DeviceState) ProtoMessage() {}

func (x *DeviceState) ProtoReflect() protoreflect.Message {
	mi := &file_meshtastic_deviceonly_proto_msgTypes[3]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use DeviceState.ProtoReflect.Descriptor instead.
func (*DeviceState) Descriptor() ([]byte, []int) {
	return file_meshtastic_deviceonly_proto_rawDescGZIP(), []int{3}
}

func (x *DeviceState) GetMyNode() *MyNodeInfo {
	if x != nil {
		return x.MyNode
	}
	return nil
}

func (x *DeviceState) GetOwner() *User {
	if x != nil {
		return x.Owner
	}
	return nil
}

func (x *DeviceState) GetReceiveQueue() []*MeshPacket {
	if x != nil {
		return x.ReceiveQueue
	}
	return nil
}

func (x *DeviceState) GetVersion() uint32 {
	if x != nil {
		return x.Version
	}
	return 0
}

func (x *DeviceState) GetRxTextMessage() *MeshPacket {
	if x != nil {
		return x.RxTextMessage
	}
	return nil
}

// Deprecated: Marked as deprecated in meshtastic/deviceonly.proto.
func (x *DeviceState) GetNoSave() bool {
	if x != nil {
		return x.NoSave
	}
	return false
}

func (x *DeviceState) GetDidGpsReset() bool {
	if x != nil {
		return x.DidGpsReset
	}
	return false
}

func (x *DeviceState) GetRxWaypoint() *MeshPacket {
	if x != nil {
		return x.RxWaypoint
	}
	return nil
}

func (x *DeviceState) GetNodeRemoteHardwarePins() []*NodeRemoteHardwarePin {
	if x != nil {
		return x.NodeRemoteHardwarePins
	}
	return nil
}

func (x *DeviceState) GetNodeDbLite() []*NodeInfoLite {
	if x != nil {
		return x.NodeDbLite
	}
	return nil
}

// The on-disk saved channels
type ChannelFile struct {
	state protoimpl.MessageState `protogen:"open.v1"`
	// The channels our node knows about
	Channels []*Channel `protobuf:"bytes,1,rep,name=channels,proto3" json:"channels,omitempty"`
	// A version integer used to invalidate old save files when we make
	// incompatible changes This integer is set at build time and is private to
	// NodeDB.cpp in the device code.
	Version       uint32 `protobuf:"varint,2,opt,name=version,proto3" json:"version,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *ChannelFile) Reset() {
	*x = ChannelFile{}
	mi := &file_meshtastic_deviceonly_proto_msgTypes[4]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *ChannelFile) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ChannelFile) ProtoMessage() {}

func (x *ChannelFile) ProtoReflect() protoreflect.Message {
	mi := &file_meshtastic_deviceonly_proto_msgTypes[4]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ChannelFile.ProtoReflect.Descriptor instead.
func (*ChannelFile) Descriptor() ([]byte, []int) {
	return file_meshtastic_deviceonly_proto_rawDescGZIP(), []int{4}
}

func (x *ChannelFile) GetChannels() []*Channel {
	if x != nil {
		return x.Channels
	}
	return nil
}

func (x *ChannelFile) GetVersion() uint32 {
	if x != nil {
		return x.Version
	}
	return 0
}

var File_meshtastic_deviceonly_proto protoreflect.FileDescriptor

var file_meshtastic_deviceonly_proto_rawDesc = string([]byte{
	0x0a, 0x1b, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2f, 0x64, 0x65, 0x76,
	0x69, 0x63, 0x65, 0x6f, 0x6e, 0x6c, 0x79, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x12, 0x0a, 0x6d,
	0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x1a, 0x18, 0x6d, 0x65, 0x73, 0x68, 0x74,
	0x61, 0x73, 0x74, 0x69, 0x63, 0x2f, 0x63, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c, 0x2e, 0x70, 0x72,
	0x6f, 0x74, 0x6f, 0x1a, 0x15, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2f,
	0x6d, 0x65, 0x73, 0x68, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x1a, 0x1a, 0x6d, 0x65, 0x73, 0x68,
	0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2f, 0x74, 0x65, 0x6c, 0x65, 0x6d, 0x65, 0x74, 0x72, 0x79,
	0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x1a, 0x17, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74,
	0x69, 0x63, 0x2f, 0x63, 0x6f, 0x6e, 0x66, 0x69, 0x67, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x22,
	0xc7, 0x01, 0x0a, 0x0c, 0x50, 0x6f, 0x73, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x4c, 0x69, 0x74, 0x65,
	0x12, 0x1d, 0x0a, 0x0a, 0x6c, 0x61, 0x74, 0x69, 0x74, 0x75, 0x64, 0x65, 0x5f, 0x69, 0x18, 0x01,
	0x20, 0x01, 0x28, 0x0f, 0x52, 0x09, 0x6c, 0x61, 0x74, 0x69, 0x74, 0x75, 0x64, 0x65, 0x49, 0x12,
	0x1f, 0x0a, 0x0b, 0x6c, 0x6f, 0x6e, 0x67, 0x69, 0x74, 0x75, 0x64, 0x65, 0x5f, 0x69, 0x18, 0x02,
	0x20, 0x01, 0x28, 0x0f, 0x52, 0x0a, 0x6c, 0x6f, 0x6e, 0x67, 0x69, 0x74, 0x75, 0x64, 0x65, 0x49,
	0x12, 0x1a, 0x0a, 0x08, 0x61, 0x6c, 0x74, 0x69, 0x74, 0x75, 0x64, 0x65, 0x18, 0x03, 0x20, 0x01,
	0x28, 0x05, 0x52, 0x08, 0x61, 0x6c, 0x74, 0x69, 0x74, 0x75, 0x64, 0x65, 0x12, 0x12, 0x0a, 0x04,
	0x74, 0x69, 0x6d, 0x65, 0x18, 0x04, 0x20, 0x01, 0x28, 0x07, 0x52, 0x04, 0x74, 0x69, 0x6d, 0x65,
	0x12, 0x47, 0x0a, 0x0f, 0x6c, 0x6f, 0x63, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x5f, 0x73, 0x6f, 0x75,
	0x72, 0x63, 0x65, 0x18, 0x05, 0x20, 0x01, 0x28, 0x0e, 0x32, 0x1e, 0x2e, 0x6d, 0x65, 0x73, 0x68,
	0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2e, 0x50, 0x6f, 0x73, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x2e,
	0x4c, 0x6f, 0x63, 0x53, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x52, 0x0e, 0x6c, 0x6f, 0x63, 0x61, 0x74,
	0x69, 0x6f, 0x6e, 0x53, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x22, 0x94, 0x02, 0x0a, 0x08, 0x55, 0x73,
	0x65, 0x72, 0x4c, 0x69, 0x74, 0x65, 0x12, 0x1c, 0x0a, 0x07, 0x6d, 0x61, 0x63, 0x61, 0x64, 0x64,
	0x72, 0x18, 0x01, 0x20, 0x01, 0x28, 0x0c, 0x42, 0x02, 0x18, 0x01, 0x52, 0x07, 0x6d, 0x61, 0x63,
	0x61, 0x64, 0x64, 0x72, 0x12, 0x1b, 0x0a, 0x09, 0x6c, 0x6f, 0x6e, 0x67, 0x5f, 0x6e, 0x61, 0x6d,
	0x65, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52, 0x08, 0x6c, 0x6f, 0x6e, 0x67, 0x4e, 0x61, 0x6d,
	0x65, 0x12, 0x1d, 0x0a, 0x0a, 0x73, 0x68, 0x6f, 0x72, 0x74, 0x5f, 0x6e, 0x61, 0x6d, 0x65, 0x18,
	0x03, 0x20, 0x01, 0x28, 0x09, 0x52, 0x09, 0x73, 0x68, 0x6f, 0x72, 0x74, 0x4e, 0x61, 0x6d, 0x65,
	0x12, 0x34, 0x0a, 0x08, 0x68, 0x77, 0x5f, 0x6d, 0x6f, 0x64, 0x65, 0x6c, 0x18, 0x04, 0x20, 0x01,
	0x28, 0x0e, 0x32, 0x19, 0x2e, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2e,
	0x48, 0x61, 0x72, 0x64, 0x77, 0x61, 0x72, 0x65, 0x4d, 0x6f, 0x64, 0x65, 0x6c, 0x52, 0x07, 0x68,
	0x77, 0x4d, 0x6f, 0x64, 0x65, 0x6c, 0x12, 0x1f, 0x0a, 0x0b, 0x69, 0x73, 0x5f, 0x6c, 0x69, 0x63,
	0x65, 0x6e, 0x73, 0x65, 0x64, 0x18, 0x05, 0x20, 0x01, 0x28, 0x08, 0x52, 0x0a, 0x69, 0x73, 0x4c,
	0x69, 0x63, 0x65, 0x6e, 0x73, 0x65, 0x64, 0x12, 0x38, 0x0a, 0x04, 0x72, 0x6f, 0x6c, 0x65, 0x18,
	0x06, 0x20, 0x01, 0x28, 0x0e, 0x32, 0x24, 0x2e, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74,
	0x69, 0x63, 0x2e, 0x43, 0x6f, 0x6e, 0x66, 0x69, 0x67, 0x2e, 0x44, 0x65, 0x76, 0x69, 0x63, 0x65,
	0x43, 0x6f, 0x6e, 0x66, 0x69, 0x67, 0x2e, 0x52, 0x6f, 0x6c, 0x65, 0x52, 0x04, 0x72, 0x6f, 0x6c,
	0x65, 0x12, 0x1d, 0x0a, 0x0a, 0x70, 0x75, 0x62, 0x6c, 0x69, 0x63, 0x5f, 0x6b, 0x65, 0x79, 0x18,
	0x07, 0x20, 0x01, 0x28, 0x0c, 0x52, 0x09, 0x70, 0x75, 0x62, 0x6c, 0x69, 0x63, 0x4b, 0x65, 0x79,
	0x22, 0xb3, 0x03, 0x0a, 0x0c, 0x4e, 0x6f, 0x64, 0x65, 0x49, 0x6e, 0x66, 0x6f, 0x4c, 0x69, 0x74,
	0x65, 0x12, 0x10, 0x0a, 0x03, 0x6e, 0x75, 0x6d, 0x18, 0x01, 0x20, 0x01, 0x28, 0x0d, 0x52, 0x03,
	0x6e, 0x75, 0x6d, 0x12, 0x28, 0x0a, 0x04, 0x75, 0x73, 0x65, 0x72, 0x18, 0x02, 0x20, 0x01, 0x28,
	0x0b, 0x32, 0x14, 0x2e, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2e, 0x55,
	0x73, 0x65, 0x72, 0x4c, 0x69, 0x74, 0x65, 0x52, 0x04, 0x75, 0x73, 0x65, 0x72, 0x12, 0x34, 0x0a,
	0x08, 0x70, 0x6f, 0x73, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x18, 0x03, 0x20, 0x01, 0x28, 0x0b, 0x32,
	0x18, 0x2e, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2e, 0x50, 0x6f, 0x73,
	0x69, 0x74, 0x69, 0x6f, 0x6e, 0x4c, 0x69, 0x74, 0x65, 0x52, 0x08, 0x70, 0x6f, 0x73, 0x69, 0x74,
	0x69, 0x6f, 0x6e, 0x12, 0x10, 0x0a, 0x03, 0x73, 0x6e, 0x72, 0x18, 0x04, 0x20, 0x01, 0x28, 0x02,
	0x52, 0x03, 0x73, 0x6e, 0x72, 0x12, 0x1d, 0x0a, 0x0a, 0x6c, 0x61, 0x73, 0x74, 0x5f, 0x68, 0x65,
	0x61, 0x72, 0x64, 0x18, 0x05, 0x20, 0x01, 0x28, 0x07, 0x52, 0x09, 0x6c, 0x61, 0x73, 0x74, 0x48,
	0x65, 0x61, 0x72, 0x64, 0x12, 0x40, 0x0a, 0x0e, 0x64, 0x65, 0x76, 0x69, 0x63, 0x65, 0x5f, 0x6d,
	0x65, 0x74, 0x72, 0x69, 0x63, 0x73, 0x18, 0x06, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x19, 0x2e, 0x6d,
	0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2e, 0x44, 0x65, 0x76, 0x69, 0x63, 0x65,
	0x4d, 0x65, 0x74, 0x72, 0x69, 0x63, 0x73, 0x52, 0x0d, 0x64, 0x65, 0x76, 0x69, 0x63, 0x65, 0x4d,
	0x65, 0x74, 0x72, 0x69, 0x63, 0x73, 0x12, 0x18, 0x0a, 0x07, 0x63, 0x68, 0x61, 0x6e, 0x6e, 0x65,
	0x6c, 0x18, 0x07, 0x20, 0x01, 0x28, 0x0d, 0x52, 0x07, 0x63, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c,
	0x12, 0x19, 0x0a, 0x08, 0x76, 0x69, 0x61, 0x5f, 0x6d, 0x71, 0x74, 0x74, 0x18, 0x08, 0x20, 0x01,
	0x28, 0x08, 0x52, 0x07, 0x76, 0x69, 0x61, 0x4d, 0x71, 0x74, 0x74, 0x12, 0x20, 0x0a, 0x09, 0x68,
	0x6f, 0x70, 0x73, 0x5f, 0x61, 0x77, 0x61, 0x79, 0x18, 0x09, 0x20, 0x01, 0x28, 0x0d, 0x48, 0x00,
	0x52, 0x08, 0x68, 0x6f, 0x70, 0x73, 0x41, 0x77, 0x61, 0x79, 0x88, 0x01, 0x01, 0x12, 0x1f, 0x0a,
	0x0b, 0x69, 0x73, 0x5f, 0x66, 0x61, 0x76, 0x6f, 0x72, 0x69, 0x74, 0x65, 0x18, 0x0a, 0x20, 0x01,
	0x28, 0x08, 0x52, 0x0a, 0x69, 0x73, 0x46, 0x61, 0x76, 0x6f, 0x72, 0x69, 0x74, 0x65, 0x12, 0x1d,
	0x0a, 0x0a, 0x69, 0x73, 0x5f, 0x69, 0x67, 0x6e, 0x6f, 0x72, 0x65, 0x64, 0x18, 0x0b, 0x20, 0x01,
	0x28, 0x08, 0x52, 0x09, 0x69, 0x73, 0x49, 0x67, 0x6e, 0x6f, 0x72, 0x65, 0x64, 0x12, 0x19, 0x0a,
	0x08, 0x6e, 0x65, 0x78, 0x74, 0x5f, 0x68, 0x6f, 0x70, 0x18, 0x0c, 0x20, 0x01, 0x28, 0x0d, 0x52,
	0x07, 0x6e, 0x65, 0x78, 0x74, 0x48, 0x6f, 0x70, 0x42, 0x0c, 0x0a, 0x0a, 0x5f, 0x68, 0x6f, 0x70,
	0x73, 0x5f, 0x61, 0x77, 0x61, 0x79, 0x22, 0x91, 0x04, 0x0a, 0x0b, 0x44, 0x65, 0x76, 0x69, 0x63,
	0x65, 0x53, 0x74, 0x61, 0x74, 0x65, 0x12, 0x2f, 0x0a, 0x07, 0x6d, 0x79, 0x5f, 0x6e, 0x6f, 0x64,
	0x65, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x16, 0x2e, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61,
	0x73, 0x74, 0x69, 0x63, 0x2e, 0x4d, 0x79, 0x4e, 0x6f, 0x64, 0x65, 0x49, 0x6e, 0x66, 0x6f, 0x52,
	0x06, 0x6d, 0x79, 0x4e, 0x6f, 0x64, 0x65, 0x12, 0x26, 0x0a, 0x05, 0x6f, 0x77, 0x6e, 0x65, 0x72,
	0x18, 0x03, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x10, 0x2e, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73,
	0x74, 0x69, 0x63, 0x2e, 0x55, 0x73, 0x65, 0x72, 0x52, 0x05, 0x6f, 0x77, 0x6e, 0x65, 0x72, 0x12,
	0x3b, 0x0a, 0x0d, 0x72, 0x65, 0x63, 0x65, 0x69, 0x76, 0x65, 0x5f, 0x71, 0x75, 0x65, 0x75, 0x65,
	0x18, 0x05, 0x20, 0x03, 0x28, 0x0b, 0x32, 0x16, 0x2e, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73,
	0x74, 0x69, 0x63, 0x2e, 0x4d, 0x65, 0x73, 0x68, 0x50, 0x61, 0x63, 0x6b, 0x65, 0x74, 0x52, 0x0c,
	0x72, 0x65, 0x63, 0x65, 0x69, 0x76, 0x65, 0x51, 0x75, 0x65, 0x75, 0x65, 0x12, 0x18, 0x0a, 0x07,
	0x76, 0x65, 0x72, 0x73, 0x69, 0x6f, 0x6e, 0x18, 0x08, 0x20, 0x01, 0x28, 0x0d, 0x52, 0x07, 0x76,
	0x65, 0x72, 0x73, 0x69, 0x6f, 0x6e, 0x12, 0x3e, 0x0a, 0x0f, 0x72, 0x78, 0x5f, 0x74, 0x65, 0x78,
	0x74, 0x5f, 0x6d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x18, 0x07, 0x20, 0x01, 0x28, 0x0b, 0x32,
	0x16, 0x2e, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2e, 0x4d, 0x65, 0x73,
	0x68, 0x50, 0x61, 0x63, 0x6b, 0x65, 0x74, 0x52, 0x0d, 0x72, 0x78, 0x54, 0x65, 0x78, 0x74, 0x4d,
	0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x12, 0x1b, 0x0a, 0x07, 0x6e, 0x6f, 0x5f, 0x73, 0x61, 0x76,
	0x65, 0x18, 0x09, 0x20, 0x01, 0x28, 0x08, 0x42, 0x02, 0x18, 0x01, 0x52, 0x06, 0x6e, 0x6f, 0x53,
	0x61, 0x76, 0x65, 0x12, 0x22, 0x0a, 0x0d, 0x64, 0x69, 0x64, 0x5f, 0x67, 0x70, 0x73, 0x5f, 0x72,
	0x65, 0x73, 0x65, 0x74, 0x18, 0x0b, 0x20, 0x01, 0x28, 0x08, 0x52, 0x0b, 0x64, 0x69, 0x64, 0x47,
	0x70, 0x73, 0x52, 0x65, 0x73, 0x65, 0x74, 0x12, 0x37, 0x0a, 0x0b, 0x72, 0x78, 0x5f, 0x77, 0x61,
	0x79, 0x70, 0x6f, 0x69, 0x6e, 0x74, 0x18, 0x0c, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x16, 0x2e, 0x6d,
	0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2e, 0x4d, 0x65, 0x73, 0x68, 0x50, 0x61,
	0x63, 0x6b, 0x65, 0x74, 0x52, 0x0a, 0x72, 0x78, 0x57, 0x61, 0x79, 0x70, 0x6f, 0x69, 0x6e, 0x74,
	0x12, 0x5c, 0x0a, 0x19, 0x6e, 0x6f, 0x64, 0x65, 0x5f, 0x72, 0x65, 0x6d, 0x6f, 0x74, 0x65, 0x5f,
	0x68, 0x61, 0x72, 0x64, 0x77, 0x61, 0x72, 0x65, 0x5f, 0x70, 0x69, 0x6e, 0x73, 0x18, 0x0d, 0x20,
	0x03, 0x28, 0x0b, 0x32, 0x21, 0x2e, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63,
	0x2e, 0x4e, 0x6f, 0x64, 0x65, 0x52, 0x65, 0x6d, 0x6f, 0x74, 0x65, 0x48, 0x61, 0x72, 0x64, 0x77,
	0x61, 0x72, 0x65, 0x50, 0x69, 0x6e, 0x52, 0x16, 0x6e, 0x6f, 0x64, 0x65, 0x52, 0x65, 0x6d, 0x6f,
	0x74, 0x65, 0x48, 0x61, 0x72, 0x64, 0x77, 0x61, 0x72, 0x65, 0x50, 0x69, 0x6e, 0x73, 0x12, 0x3a,
	0x0a, 0x0c, 0x6e, 0x6f, 0x64, 0x65, 0x5f, 0x64, 0x62, 0x5f, 0x6c, 0x69, 0x74, 0x65, 0x18, 0x0e,
	0x20, 0x03, 0x28, 0x0b, 0x32, 0x18, 0x2e, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69,
	0x63, 0x2e, 0x4e, 0x6f, 0x64, 0x65, 0x49, 0x6e, 0x66, 0x6f, 0x4c, 0x69, 0x74, 0x65, 0x52, 0x0a,
	0x6e, 0x6f, 0x64, 0x65, 0x44, 0x62, 0x4c, 0x69, 0x74, 0x65, 0x22, 0x58, 0x0a, 0x0b, 0x43, 0x68,
	0x61, 0x6e, 0x6e, 0x65, 0x6c, 0x46, 0x69, 0x6c, 0x65, 0x12, 0x2f, 0x0a, 0x08, 0x63, 0x68, 0x61,
	0x6e, 0x6e, 0x65, 0x6c, 0x73, 0x18, 0x01, 0x20, 0x03, 0x28, 0x0b, 0x32, 0x13, 0x2e, 0x6d, 0x65,
	0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2e, 0x43, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c,
	0x52, 0x08, 0x63, 0x68, 0x61, 0x6e, 0x6e, 0x65, 0x6c, 0x73, 0x12, 0x18, 0x0a, 0x07, 0x76, 0x65,
	0x72, 0x73, 0x69, 0x6f, 0x6e, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0d, 0x52, 0x07, 0x76, 0x65, 0x72,
	0x73, 0x69, 0x6f, 0x6e, 0x42, 0x5f, 0x0a, 0x13, 0x63, 0x6f, 0x6d, 0x2e, 0x67, 0x65, 0x65, 0x6b,
	0x73, 0x76, 0x69, 0x6c, 0x6c, 0x65, 0x2e, 0x6d, 0x65, 0x73, 0x68, 0x42, 0x0a, 0x44, 0x65, 0x76,
	0x69, 0x63, 0x65, 0x4f, 0x6e, 0x6c, 0x79, 0x5a, 0x22, 0x67, 0x69, 0x74, 0x68, 0x75, 0x62, 0x2e,
	0x63, 0x6f, 0x6d, 0x2f, 0x6d, 0x65, 0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2f, 0x67,
	0x6f, 0x2f, 0x67, 0x65, 0x6e, 0x65, 0x72, 0x61, 0x74, 0x65, 0x64, 0xaa, 0x02, 0x14, 0x4d, 0x65,
	0x73, 0x68, 0x74, 0x61, 0x73, 0x74, 0x69, 0x63, 0x2e, 0x50, 0x72, 0x6f, 0x74, 0x6f, 0x62, 0x75,
	0x66, 0x73, 0xba, 0x02, 0x00, 0x62, 0x06, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x33,
})

var (
	file_meshtastic_deviceonly_proto_rawDescOnce sync.Once
	file_meshtastic_deviceonly_proto_rawDescData []byte
)

func file_meshtastic_deviceonly_proto_rawDescGZIP() []byte {
	file_meshtastic_deviceonly_proto_rawDescOnce.Do(func() {
		file_meshtastic_deviceonly_proto_rawDescData = protoimpl.X.CompressGZIP(unsafe.Slice(unsafe.StringData(file_meshtastic_deviceonly_proto_rawDesc), len(file_meshtastic_deviceonly_proto_rawDesc)))
	})
	return file_meshtastic_deviceonly_proto_rawDescData
}

var file_meshtastic_deviceonly_proto_msgTypes = make([]protoimpl.MessageInfo, 5)
var file_meshtastic_deviceonly_proto_goTypes = []any{
	(*PositionLite)(nil),          // 0: meshtastic.PositionLite
	(*UserLite)(nil),              // 1: meshtastic.UserLite
	(*NodeInfoLite)(nil),          // 2: meshtastic.NodeInfoLite
	(*DeviceState)(nil),           // 3: meshtastic.DeviceState
	(*ChannelFile)(nil),           // 4: meshtastic.ChannelFile
	(Position_LocSource)(0),       // 5: meshtastic.Position.LocSource
	(HardwareModel)(0),            // 6: meshtastic.HardwareModel
	(Config_DeviceConfig_Role)(0), // 7: meshtastic.Config.DeviceConfig.Role
	(*DeviceMetrics)(nil),         // 8: meshtastic.DeviceMetrics
	(*MyNodeInfo)(nil),            // 9: meshtastic.MyNodeInfo
	(*User)(nil),                  // 10: meshtastic.User
	(*MeshPacket)(nil),            // 11: meshtastic.MeshPacket
	(*NodeRemoteHardwarePin)(nil), // 12: meshtastic.NodeRemoteHardwarePin
	(*Channel)(nil),               // 13: meshtastic.Channel
}
var file_meshtastic_deviceonly_proto_depIdxs = []int32{
	5,  // 0: meshtastic.PositionLite.location_source:type_name -> meshtastic.Position.LocSource
	6,  // 1: meshtastic.UserLite.hw_model:type_name -> meshtastic.HardwareModel
	7,  // 2: meshtastic.UserLite.role:type_name -> meshtastic.Config.DeviceConfig.Role
	1,  // 3: meshtastic.NodeInfoLite.user:type_name -> meshtastic.UserLite
	0,  // 4: meshtastic.NodeInfoLite.position:type_name -> meshtastic.PositionLite
	8,  // 5: meshtastic.NodeInfoLite.device_metrics:type_name -> meshtastic.DeviceMetrics
	9,  // 6: meshtastic.DeviceState.my_node:type_name -> meshtastic.MyNodeInfo
	10, // 7: meshtastic.DeviceState.owner:type_name -> meshtastic.User
	11, // 8: meshtastic.DeviceState.receive_queue:type_name -> meshtastic.MeshPacket
	11, // 9: meshtastic.DeviceState.rx_text_message:type_name -> meshtastic.MeshPacket
	11, // 10: meshtastic.DeviceState.rx_waypoint:type_name -> meshtastic.MeshPacket
	12, // 11: meshtastic.DeviceState.node_remote_hardware_pins:type_name -> meshtastic.NodeRemoteHardwarePin
	2,  // 12: meshtastic.DeviceState.node_db_lite:type_name -> meshtastic.NodeInfoLite
	13, // 13: meshtastic.ChannelFile.channels:type_name -> meshtastic.Channel
	14, // [14:14] is the sub-list for method output_type
	14, // [14:14] is the sub-list for method input_type
	14, // [14:14] is the sub-list for extension type_name
	14, // [14:14] is the sub-list for extension extendee
	0,  // [0:14] is the sub-list for field type_name
}

func init() { file_meshtastic_deviceonly_proto_init() }
func file_meshtastic_deviceonly_proto_init() {
	if File_meshtastic_deviceonly_proto != nil {
		return
	}
	file_meshtastic_channel_proto_init()
	file_meshtastic_mesh_proto_init()
	file_meshtastic_telemetry_proto_init()
	file_meshtastic_config_proto_init()
	file_meshtastic_deviceonly_proto_msgTypes[2].OneofWrappers = []any{}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: unsafe.Slice(unsafe.StringData(file_meshtastic_deviceonly_proto_rawDesc), len(file_meshtastic_deviceonly_proto_rawDesc)),
			NumEnums:      0,
			NumMessages:   5,
			NumExtensions: 0,
			NumServices:   0,
		},
		GoTypes:           file_meshtastic_deviceonly_proto_goTypes,
		DependencyIndexes: file_meshtastic_deviceonly_proto_depIdxs,
		MessageInfos:      file_meshtastic_deviceonly_proto_msgTypes,
	}.Build()
	File_meshtastic_deviceonly_proto = out.File
	file_meshtastic_deviceonly_proto_goTypes = nil
	file_meshtastic_deviceonly_proto_depIdxs = nil
}
