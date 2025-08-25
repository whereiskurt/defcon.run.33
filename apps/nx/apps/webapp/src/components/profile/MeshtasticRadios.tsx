'use client';

import { useState, useEffect } from 'react';
import { usePersistedState } from '../../hooks/usePersistedState';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Button,
  Input,
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Skeleton,
} from '@heroui/react';
import { Trash2, Plus, Radio, Lock, Unlock, AlertCircle, Eye, EyeOff, Edit3, Save, X, Map, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

interface MeshtasticRadio {
  id: string;
  nodeId: string;
  privateKey: string;
  publicKey: string;
  impersonate: boolean;
  addPublicKey: boolean;
  verificationCode: string;
  verified: boolean;
  createdAt: number;
  verifiedAt?: number;
  verificationAttempts?: number;
  resendAttempts?: number;
}

export default function MeshtasticRadios() {
  const [radios, setRadios] = useState<MeshtasticRadio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [newRadio, setNewRadio] = useState({
    nodeId: '',
    privateKey: '',
    publicKey: '',
    impersonate: false,
    addPublicKey: false,
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [showModalPrivateKey, setShowModalPrivateKey] = useState(false);
  const [verificationInputs, setVerificationInputs] = useState<{ [key: string]: string }>({});
  const [pinInputs, setPinInputs] = useState<{ [key: string]: string[] }>({});
  const [quota, setQuota] = useState({ used: 0, total: 5 });
  const [showPrivateKeys, setShowPrivateKeys] = useState<{ [key: string]: boolean }>({});
  const [editingRadios, setEditingRadios] = useState<{ [key: string]: boolean }>({});
  const [editValues, setEditValues] = useState<{ [key: string]: { privateKey: string; publicKey: string; impersonate: boolean; addPublicKey: boolean } }>({});
  const [editErrors, setEditErrors] = useState<{ [key: string]: string | null }>({});
  const [showMeshtasticMap, setShowMeshtasticMap] = useState(false);
  const [meshtasticCheckIns, setMeshtasticCheckIns] = useState<any[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; radioId: string; nodeId: string }>({
    isOpen: false,
    radioId: '',
    nodeId: ''
  });
  const [resendConfirmation, setResendConfirmation] = useState<{ isOpen: boolean; radioId: string; nodeId: string }>({
    isOpen: false,
    radioId: '',
    nodeId: ''
  });
  const [focusedVerifyButtons, setFocusedVerifyButtons] = useState<{ [key: string]: boolean }>({});
  const [isExpanded, setIsExpanded] = usePersistedState('profile-meshtastic-expanded', false);

  useEffect(() => {
    fetchRadios();
    fetchMeshtasticCheckIns();
  }, []);

  const fetchMeshtasticCheckIns = async () => {
    try {
      const response = await fetch('/api/user/checkins?limit=100');
      if (!response.ok) return;
      const data = await response.json();
      const allCheckIns = data.checkIns || [];
      // Filter for meshtastic check-ins (for future use when 'meshtastic' source is added)
      const meshtasticOnly = allCheckIns.filter((checkIn: any) => checkIn.source === 'meshtastic');
      setMeshtasticCheckIns(meshtasticOnly);
    } catch (err) {
      console.error('Failed to fetch meshtastic check-ins:', err);
    }
  };

  const fetchRadios = async () => {
    try {
      const response = await fetch('/api/meshtastic-radios');
      if (!response.ok) throw new Error('Failed to fetch radios');
      const data = await response.json();
      setRadios(data.radios || []);
      setQuota(data.quota || { used: 0, total: 5 });
    } catch (err) {
      setError('Failed to load radios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateAndFormatNodeId = (nodeId: string): { isValid: boolean; formatted: string } => {
    if (!nodeId.trim()) return { isValid: false, formatted: nodeId };
    
    if (nodeId.startsWith('!')) {
      // Hex format validation
      const hexPart = nodeId.slice(1);
      if (!/^[0-9a-fA-F]+$/.test(hexPart)) return { isValid: false, formatted: nodeId };
      if (hexPart.length === 0 || hexPart.length > 8) return { isValid: false, formatted: nodeId };
      return { isValid: true, formatted: nodeId };
    } else {
      // Integer format validation and conversion
      const intValue = parseInt(nodeId, 10);
      if (isNaN(intValue) || intValue < 0 || intValue > 0xFFFFFFFF) return { isValid: false, formatted: nodeId };
      const hexValue = intValue.toString(16);
      return { isValid: true, formatted: `!${hexValue}` };
    }
  };

  const handleAddRadio = async () => {
    // Validate and format NodeID
    const nodeIdValidation = validateAndFormatNodeId(newRadio.nodeId);
    if (!nodeIdValidation.isValid) {
      setModalError('Invalid NodeID. Must be hex (!1234abcd) or integer (≤32-bit)');
      return;
    }

    // Validate that public key is provided when add public key is enabled
    if (newRadio.addPublicKey && !newRadio.publicKey.trim()) {
      setModalError('Public key is required when "Add public key" is enabled');
      return;
    }

    // Validate that private key is provided when impersonation is enabled
    if (newRadio.impersonate && !newRadio.privateKey.trim()) {
      setModalError('Private key is required when "Allow impersonation" is enabled');
      return;
    }

    try {
      setModalError(null);
      const radioData = {
        ...newRadio,
        nodeId: nodeIdValidation.formatted
      };
      const response = await fetch('/api/meshtastic-radios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(radioData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add radio');
      }

      const data = await response.json();
      setRadios([...radios, data.radio]);
      // Increment quota used count since a new radio was successfully added
      setQuota({ used: quota.used + 1, total: quota.total });
      onOpenChange();
      setNewRadio({ nodeId: '', privateKey: '', publicKey: '', impersonate: false, addPublicKey: false });
      setModalError(null);
      setShowModalPrivateKey(false);
    } catch (err: any) {
      setModalError(err.message || 'Failed to add radio');
    }
  };

  const handleVerify = async (radioId: string) => {
    const code = verificationInputs[radioId];
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    const radio = radios.find(r => r.id === radioId);
    if (radio && (radio.verificationAttempts || 0) >= 5) {
      setError('Maximum verification attempts exceeded (5)');
      return;
    }

    // Remove green focus styling when starting verification
    setFocusedVerifyButtons({ ...focusedVerifyButtons, [radioId]: false });

    try {
      setError(null);
      const response = await fetch('/api/meshtastic-radios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ radioId, verificationCode: code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to verify radio');
      }

      const data = await response.json();
      setRadios(radios.map(r => r.id === radioId ? data.radio : r));
      setVerificationInputs({ ...verificationInputs, [radioId]: '' });
    } catch (err: any) {
      // Clear digits, show error, and focus back to first input on failure
      setPinInputs({ ...pinInputs, [radioId]: ['', '', '', '', '', ''] });
      setVerificationInputs({ ...verificationInputs, [radioId]: '' });
      setError(err.message || 'Failed to verify radio');
      
      // Focus on the first PIN input after clearing
      setTimeout(() => {
        const firstInput = document.getElementById(`pin-${radioId}-0`);
        firstInput?.focus();
      }, 100);
    }
  };

  const handleResendCode = async () => {
    const { radioId } = resendConfirmation;

    try {
      setError(null);
      const response = await fetch('/api/meshtastic-radios/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ radioId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend code');
      }

      const data = await response.json();
      setRadios(radios.map(r => r.id === radioId ? data.radio : r));
      
      // Clear all PIN digits and focus on first input
      setPinInputs({ ...pinInputs, [radioId]: ['', '', '', '', '', ''] });
      setVerificationInputs({ ...verificationInputs, [radioId]: '' });
      
      // Focus on the first PIN input after a brief delay to ensure DOM is updated
      setTimeout(() => {
        const firstInput = document.getElementById(`pin-${radioId}-0`);
        firstInput?.focus();
      }, 100);
      
      closeResendConfirmation();
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    }
  };

  const handleUpdateRadio = async (radioId: string, updates: Partial<MeshtasticRadio>) => {
    try {
      setError(null);
      const response = await fetch('/api/meshtastic-radios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ radioId, ...updates }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update radio');
      }

      const data = await response.json();
      setRadios(radios.map(r => r.id === radioId ? data.radio : r));
    } catch (err: any) {
      setError(err.message || 'Failed to update radio');
    }
  };

  const openDeleteConfirmation = (radioId: string, nodeId: string) => {
    setDeleteConfirmation({ isOpen: true, radioId, nodeId });
  };

  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({ isOpen: false, radioId: '', nodeId: '' });
  };

  const openResendConfirmation = (radioId: string, nodeId: string) => {
    setResendConfirmation({ isOpen: true, radioId, nodeId });
  };

  const closeResendConfirmation = () => {
    setResendConfirmation({ isOpen: false, radioId: '', nodeId: '' });
  };

  const handleDeleteRadio = async () => {
    const { radioId } = deleteConfirmation;
    
    try {
      setError(null);
      const response = await fetch(`/api/meshtastic-radios?radioId=${radioId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete radio');
      }

      setRadios(radios.filter(r => r.id !== radioId));
      // Quota never decreases - it tracks cumulative radios added, not current count
      closeDeleteConfirmation();
    } catch (err: any) {
      setError(err.message || 'Failed to delete radio');
    }
  };

  const handleVerificationInputChange = (radioId: string, value: string) => {
    if (value.length <= 6 && /^\d*$/.test(value)) {
      setVerificationInputs({ ...verificationInputs, [radioId]: value });
    }
  };

  const handlePinInputChange = (radioId: string, index: number, value: string) => {
    if (/^\d?$/.test(value)) {
      const currentPin = pinInputs[radioId] || ['', '', '', '', '', ''];
      const newPin = [...currentPin];
      newPin[index] = value;
      setPinInputs({ ...pinInputs, [radioId]: newPin });
      
      // Update the verification input for backend compatibility
      const fullCode = newPin.join('');
      setVerificationInputs({ ...verificationInputs, [radioId]: fullCode });
      
      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`pin-${radioId}-${index + 1}`);
        nextInput?.focus();
      }
      
      // If this is the 6th digit and all digits are filled, focus the verify button
      if (index === 5 && value && fullCode.length === 6) {
        setFocusedVerifyButtons({ ...focusedVerifyButtons, [radioId]: true });
        setTimeout(() => {
          const verifyButton = document.getElementById(`verify-${radioId}`);
          verifyButton?.focus();
        }, 100);
      }
    }
  };

  const handlePinKeyDown = (radioId: string, index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pinInputs[radioId]?.[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${radioId}-${index - 1}`);
      prevInput?.focus();
      // Remove green focus if we're backspacing
      setFocusedVerifyButtons({ ...focusedVerifyButtons, [radioId]: false });
    }
    
    // If Enter is pressed and all 6 digits are filled, trigger verification
    if (e.key === 'Enter') {
      const code = verificationInputs[radioId] || '';
      if (code.length === 6) {
        handleVerify(radioId);
      }
    }
  };

  const handleVerifyKeyDown = (radioId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify(radioId);
    }
  };

  const togglePrivateKeyVisibility = (radioId: string) => {
    setShowPrivateKeys({ 
      ...showPrivateKeys, 
      [radioId]: !showPrivateKeys[radioId] 
    });
  };

  const startEditing = (radio: MeshtasticRadio) => {
    setEditingRadios({ ...editingRadios, [radio.id]: true });
    setEditValues({ 
      ...editValues, 
      [radio.id]: { 
        privateKey: radio.privateKey,
        publicKey: radio.publicKey || '',
        impersonate: radio.impersonate,
        addPublicKey: radio.addPublicKey || false
      } 
    });
  };

  const cancelEditing = (radioId: string) => {
    setEditingRadios({ ...editingRadios, [radioId]: false });
    const { [radioId]: _, ...remainingEditValues } = editValues;
    setEditValues(remainingEditValues);
    setEditErrors({ ...editErrors, [radioId]: null });
  };

  const saveEditing = async (radioId: string) => {
    const editValue = editValues[radioId];
    if (!editValue) return;

    // Validate that public key is provided when add public key is enabled
    if (editValue.addPublicKey && !editValue.publicKey.trim()) {
      setEditErrors({ ...editErrors, [radioId]: 'Public key is required when "Add public key" is enabled' });
      return;
    }

    // Validate that private key is provided when impersonation is enabled
    if (editValue.impersonate && !editValue.privateKey.trim()) {
      setEditErrors({ ...editErrors, [radioId]: 'Private key is required when "Allow impersonation" is enabled' });
      return;
    }

    try {
      setEditErrors({ ...editErrors, [radioId]: null });
      await handleUpdateRadio(radioId, editValue);
      setEditingRadios({ ...editingRadios, [radioId]: false });
      const { [radioId]: _, ...remainingEditValues } = editValues;
      setEditValues(remainingEditValues);
      setEditErrors({ ...editErrors, [radioId]: null });
    } catch (err: any) {
      setEditErrors({ ...editErrors, [radioId]: err.message || 'Failed to save changes' });
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Meshtastic</h3>
                <Skeleton className="w-6 h-4 rounded">
                  <div className="h-4 w-6 bg-default-300"></div>
                </Skeleton>
              </div>
              <p className="text-sm text-default-500">
                Manage your Meshtastic radio connections
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              color="success"
              variant="flat"
              size="lg"
              disabled
            >
              <Plus className="h-6 w-6" />
            </Button>
            <Button 
              isIconOnly 
              variant="light" 
              size="sm"
              disabled
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <Divider />
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex justify-between items-center pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Meshtastic</h3>
                <Chip 
                  size="sm" 
                  variant="flat" 
                  color={radios.length > 0 ? "success" : "default"}
                >
                  {radios.length}
                </Chip>
              </div>
              <p className="text-sm text-default-500">
                {quota.used} of {quota.total} Radios Used 
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              color="success"
              variant="flat"
              size="lg"
              onClick={onOpen}
              disabled={quota.used >= quota.total}
            >
              <Plus className="h-6 w-6" />
            </Button>
            <Button 
              isIconOnly 
              variant="light" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <Divider />
        {isExpanded && (
          <CardBody className="space-y-4">
          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded relative">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </span>
            </div>
          )}

          <div className="space-y-1">
            {radios.length === 0 ? (
              <p className="text-sm text-default-500 text-center py-4">
                No radios configured yet. Add your first radio to get started.
              </p>
            ) : (
              radios.map((radio) => (
                <div key={radio.id} className="border border-default-200 rounded-lg p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-default-500" />
                      <span className="font-mono text-sm">{radio.nodeId}</span>
                      {radio.verified ? (
                        <Chip color="success" size="sm" variant="flat" startContent={<Unlock className="h-3 w-3" />}>
                          Verified
                        </Chip>
                      ) : (
                        <Chip color="warning" size="sm" variant="flat" startContent={<Lock className="h-3 w-3" />}>
                          Pending
                        </Chip>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {radio.verified && !editingRadios[radio.id] && (
                        <>
                          <Button
                            isIconOnly
                            variant="light"
                            size="lg"
                            onClick={() => startEditing(radio)}
                          >
                            <Edit3 className="h-6 w-6" />
                          </Button>
                          <Button
                            isIconOnly
                            variant="light"
                            size="lg"
                            onClick={() => openDeleteConfirmation(radio.id, radio.nodeId)}
                          >
                            <Trash2 className="h-6 w-6" />
                          </Button>
                        </>
                      )}
                      {radio.verified && editingRadios[radio.id] && (
                        <>
                          <Button
                            isIconOnly
                            variant="light"
                            size="lg"
                            onClick={() => saveEditing(radio.id)}
                          >
                            <Save className="h-6 w-6" />
                          </Button>
                          <Button
                            isIconOnly
                            color="danger"
                            variant="light"
                            size="lg"
                            onClick={() => cancelEditing(radio.id)}
                          >
                            <X className="h-6 w-6" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {!radio.verified && (
                    <div className="space-y-3">
                      <p className="text-xs pt-2 text-center">Enter 6-digit verification code:</p>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-1 justify-center">
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <Input
                              key={index}
                              id={`pin-${radio.id}-${index}`}
                              type="text"
                              maxLength={1}
                              value={pinInputs[radio.id]?.[index] || ''}
                              onChange={(e) => handlePinInputChange(radio.id, index, e.target.value)}
                              onKeyDown={(e) => handlePinKeyDown(radio.id, index, e)}
                              className="w-14 h-14"
                              classNames={{
                                input: "text-center text-3xl font-bold font-mono",
                                inputWrapper: "h-14 min-h-14"
                              }}
                              size="lg"
                            />
                          ))}
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            id={`verify-${radio.id}`}
                            onClick={() => handleVerify(radio.id)}
                            onKeyDown={(e) => handleVerifyKeyDown(radio.id, e)}
                            onBlur={() => setFocusedVerifyButtons({ ...focusedVerifyButtons, [radio.id]: false })}
                            disabled={(verificationInputs[radio.id] || '').length !== 6 || (radio.verificationAttempts || 0) >= 5}
                            size="lg"
                            className={`min-w-24 ${focusedVerifyButtons[radio.id] ? 'border-2 border-dashed border-success' : ''}`}
                          >
                            Verify
                          </Button>
                          <Button
                            isIconOnly
                            onClick={() => openResendConfirmation(radio.id, radio.nodeId)}
                            variant="flat"
                            size="lg"
                            isDisabled={(radio.verificationAttempts || 0) >= 5 || (radio.resendAttempts || 0) >= 3}
                          >
                            <RotateCcw className="h-6 w-6" />
                          </Button>
                          <Button
                            isIconOnly
                            onClick={() => openDeleteConfirmation(radio.id, radio.nodeId)}
                            variant="flat"
                            color="danger"
                            size="lg"
                          >
                            <Trash2 className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                      {(radio.verificationAttempts || 0) >= 5 ? (
                        <p className="text-xs text-danger-500 text-center">
                          Maximum verification attempts exceeded. This radio cannot be verified.
                        </p>
                      ) : (
                        <p className="text-xs text-default-500 text-center">
                          A code was sent to your radio ({5 - (radio.verificationAttempts || 0)} attempt{5 - (radio.verificationAttempts || 0) !== 1 ? 's' : ''} left{(radio.resendAttempts || 0) > 0 && `, ${3 - (radio.resendAttempts || 0)} resend${3 - (radio.resendAttempts || 0) !== 1 ? 's' : ''} left`})
                        </p>
                      )}
                    </div>
                  )}

                  {radio.verified && !editingRadios[radio.id] && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-default-500">Add public key:</span>
                        <Chip size="sm" color={radio.addPublicKey ? "success" : "default"} variant="flat">
                          {radio.addPublicKey ? "Yes" : "No"}
                        </Chip>
                      </div>
                      
                      {radio.addPublicKey && radio.publicKey && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-default-500">Public Key:</span>
                          <span className="text-sm font-mono">
                            {radio.publicKey}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-default-500">Allow impersonation:</span>
                        <Chip size="sm" color={radio.impersonate ? "success" : "default"} variant="flat">
                          {radio.impersonate ? "Yes" : "No"}
                        </Chip>
                      </div>
                      
                      {radio.impersonate && radio.privateKey && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-default-500">Private Key:</span>
                          <span className="text-sm font-mono">
                            {showPrivateKeys[radio.id] ? radio.privateKey : '••••••••••••••••'}
                          </span>
                          <Button
                            isIconOnly
                            variant="light"
                            size="lg"
                            onClick={() => togglePrivateKeyVisibility(radio.id)}
                          >
                            {showPrivateKeys[radio.id] ? 
                              <EyeOff className="h-6 w-6" /> : 
                              <Eye className="h-6 w-6" />
                            }
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {radio.verified && editingRadios[radio.id] && (
                    <div className="space-y-2">
                      {editErrors[radio.id] && (
                        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-3 py-2 rounded text-sm">
                          <span className="flex items-center gap-2">
                            <AlertCircle className="h-3 w-3" />
                            {editErrors[radio.id]}
                          </span>
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            isSelected={editValues[radio.id]?.addPublicKey ?? radio.addPublicKey}
                            onValueChange={(checked) => 
                              setEditValues({ 
                                ...editValues, 
                                [radio.id]: { 
                                  ...editValues[radio.id], 
                                  addPublicKey: checked,
                                  publicKey: checked ? (editValues[radio.id]?.publicKey ?? radio.publicKey ?? '') : ''
                                } 
                              })
                            }
                          />
                          <label 
                            className="text-sm font-normal cursor-pointer"
                            onClick={() => setEditValues({ 
                              ...editValues, 
                              [radio.id]: { 
                                ...editValues[radio.id], 
                                addPublicKey: !(editValues[radio.id]?.addPublicKey ?? radio.addPublicKey),
                                publicKey: !(editValues[radio.id]?.addPublicKey ?? radio.addPublicKey) ? (editValues[radio.id]?.publicKey ?? radio.publicKey ?? '') : ''
                              } 
                            })}
                          >
                            Add public key
                          </label>
                        </div>
                        {(editValues[radio.id]?.addPublicKey ?? radio.addPublicKey) && (
                          <Input
                            type="text"
                            placeholder="Public key (optional)"
                            value={editValues[radio.id]?.publicKey ?? radio.publicKey ?? ''}
                            onChange={(e) => 
                              setEditValues({ 
                                ...editValues, 
                                [radio.id]: { 
                                  ...editValues[radio.id], 
                                  publicKey: e.target.value 
                                } 
                              })
                            }
                            color="default"
                            className="ml-6"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            isSelected={editValues[radio.id]?.impersonate ?? radio.impersonate}
                            onValueChange={(checked) => 
                              setEditValues({ 
                                ...editValues, 
                                [radio.id]: { 
                                  ...editValues[radio.id], 
                                  impersonate: checked,
                                  privateKey: checked ? (editValues[radio.id]?.privateKey ?? radio.privateKey) : ''
                                } 
                              })
                            }
                          />
                          <label 
                            className="text-sm font-normal cursor-pointer"
                            onClick={() => setEditValues({ 
                              ...editValues, 
                              [radio.id]: { 
                                ...editValues[radio.id], 
                                impersonate: !(editValues[radio.id]?.impersonate ?? radio.impersonate),
                                privateKey: !(editValues[radio.id]?.impersonate ?? radio.impersonate) ? (editValues[radio.id]?.privateKey ?? radio.privateKey) : ''
                              } 
                            })}
                          >
                            Allow impersonation
                          </label>
                        </div>
                        {(editValues[radio.id]?.impersonate ?? radio.impersonate) && (
                          <Input
                            type={showPrivateKeys[radio.id] ? "text" : "password"}
                            placeholder="Cut & Paste value from Meshtastic App"
                            value={editValues[radio.id]?.privateKey ?? radio.privateKey}
                            onChange={(e) => 
                              setEditValues({ 
                                ...editValues, 
                                [radio.id]: { 
                                  ...editValues[radio.id], 
                                  impersonate: editValues[radio.id]?.impersonate ?? radio.impersonate,
                                  privateKey: e.target.value 
                                } 
                              })
                            }
                            isRequired
                            color="default"
                            className="ml-6"
                            endContent={
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                onClick={() => togglePrivateKeyVisibility(radio.id)}
                              >
                                {showPrivateKeys[radio.id] ? 
                                  <EyeOff className="h-4 w-4" /> : 
                                  <Eye className="h-4 w-4" />
                                }
                              </Button>
                            }
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          </CardBody>
        )}
      </Card>

      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Add Meshtastic Radio
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500 mb-4">
                  Enter your radio's Node ID. You'll need to verify ownership with a 6-digit code.
                </p>
                {modalError && (
                  <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded relative mb-4">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {modalError}
                    </span>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm">Node ID</label>
                    <Input
                      placeholder="!12345678"
                      value={newRadio.nodeId}
                      onChange={(e) => setNewRadio({ ...newRadio, nodeId: e.target.value })}
                      color={newRadio.nodeId && !validateAndFormatNodeId(newRadio.nodeId).isValid ? "danger" : "default"}
                      description={newRadio.nodeId && !validateAndFormatNodeId(newRadio.nodeId).isValid ? "Must be hex (!1234abcd) or integer (≤32-bit)" : ""}
                      size="lg"
                      classNames={{
                        input: "text-xl font-mono font-semibold"
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        isSelected={newRadio.addPublicKey}
                        onValueChange={(checked) => 
                          setNewRadio({ ...newRadio, addPublicKey: checked, publicKey: checked ? newRadio.publicKey : '' })
                        }
                      />
                      <label 
                        className="text-sm font-normal cursor-pointer"
                        onClick={() => setNewRadio({ ...newRadio, addPublicKey: !newRadio.addPublicKey, publicKey: !newRadio.addPublicKey ? newRadio.publicKey : '' })}
                      >
                        Add public key
                      </label>
                    </div>
                    {newRadio.addPublicKey && (
                      <Input
                        type="text"
                        placeholder="Public key (optional)"
                        value={newRadio.publicKey}
                        onChange={(e) => setNewRadio({ ...newRadio, publicKey: e.target.value })}
                        color="default"
                        className="ml-6"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        isSelected={newRadio.impersonate}
                        onValueChange={(checked) => 
                          setNewRadio({ ...newRadio, impersonate: checked, privateKey: checked ? newRadio.privateKey : '' })
                        }
                      />
                      <label 
                        className="text-sm font-normal cursor-pointer"
                        onClick={() => setNewRadio({ ...newRadio, impersonate: !newRadio.impersonate, privateKey: !newRadio.impersonate ? newRadio.privateKey : '' })}
                      >
                        Allow impersonation
                      </label>
                    </div>
                    {newRadio.impersonate && (
                      <Input
                        type={showModalPrivateKey ? "text" : "password"}
                        placeholder="Cut&Paste from Meshtastic App"
                        value={newRadio.privateKey}
                        onChange={(e) => setNewRadio({ ...newRadio, privateKey: e.target.value })}
                        isRequired
                        color="default"
                        className="ml-6"
                        endContent={
                          <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            onClick={() => setShowModalPrivateKey(!showModalPrivateKey)}
                          >
                            {showModalPrivateKey ? 
                              <EyeOff className="h-4 w-4" /> : 
                              <Eye className="h-4 w-4" />
                            }
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={() => {
                  onClose();
                  setModalError(null);
                  setShowModalPrivateKey(false);
                  setNewRadio({ nodeId: '', privateKey: '', publicKey: '', impersonate: false, addPublicKey: false });
                }}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleAddRadio} disabled={!newRadio.nodeId}>
                  Add Radio
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal 
        isOpen={showMeshtasticMap} 
        onOpenChange={setShowMeshtasticMap}
        size="5xl"
        scrollBehavior="inside"
        backdrop="blur"
        classNames={{
          wrapper: "z-[99999]",
          backdrop: "z-[99998]",
          base: "z-[99999]"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Meshtastic Check-ins Map
                </div>
                <p className="text-sm text-default-500">
                  {meshtasticCheckIns.length === 0 
                    ? "No meshtastic check-ins recorded yet. Future check-ins from meshtastic radios will appear here."
                    : `Showing ${meshtasticCheckIns.length} meshtastic check-ins`
                  }
                </p>
              </ModalHeader>
              <ModalBody>
                {meshtasticCheckIns.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="text-default-400">
                      <Map className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No Meshtastic Check-ins Yet</p>
                      <p className="text-sm">
                        When you start using verified meshtastic radios for check-ins, 
                        they will appear on this map.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-96 bg-default-100 rounded-lg flex items-center justify-center">
                      <div className="text-default-500 text-sm">
                        Map component would display meshtastic check-ins here
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Meshtastic Check-ins</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {meshtasticCheckIns.map((checkIn, index) => (
                          <div key={index} className="p-3 rounded-lg border border-default-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Radio className="h-4 w-4 text-default-500" />
                                <span className="text-sm font-medium">
                                  {new Date(checkIn.timestamp || 0).toLocaleString()}
                                </span>
                                <Chip size="sm" color="secondary" variant="flat">
                                  Meshtastic
                                </Chip>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal 
        size="sm"
        placement="center"
        isOpen={deleteConfirmation.isOpen}
        backdrop="blur"
        onClose={closeDeleteConfirmation}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">Delete Radio?</ModalHeader>
              <ModalBody>
                <p>
                  Do you want to delete radio <span className="font-mono font-semibold">{deleteConfirmation.nodeId}</span>?
                </p>
                <p className="text-sm text-default-500">
                  This action cannot be undone. You will need to re-add and verify the radio if you want to use it again.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onClick={handleDeleteRadio}>
                  Delete Radio
                </Button>
                <Button color="primary" onClick={closeDeleteConfirmation}>
                  Cancel
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal 
        size="sm"
        placement="center"
        isOpen={resendConfirmation.isOpen}
        backdrop="blur"
        onClose={closeResendConfirmation}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">Resend Code?</ModalHeader>
              <ModalBody>
                <p>
                  Resend verification code to radio <span className="font-mono font-semibold">{resendConfirmation.nodeId}</span>?
                </p>
                <p className="text-sm text-default-500">
                  A new 6-digit code will be sent to your radio via PKI.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onClick={handleResendCode}>
                  Resend Code
                </Button>
                <Button color="default" variant="light" onClick={closeResendConfirmation}>
                  Cancel
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}