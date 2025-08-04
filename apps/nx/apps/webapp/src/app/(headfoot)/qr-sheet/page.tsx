'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, Divider, Input, Button, Chip, Checkbox, Link } from '@heroui/react';

export default function QRSheetHomePage() {
  const router = useRouter();
  const [customId, setCustomId] = useState('');
  const [template, setTemplate] = useState('');
  const [includeProofPages, setIncludeProofPages] = useState(true);

  const handleGenerateSheet = () => {
    const id = customId.trim() || generateRandomId();
    let url = `/qr-sheet/${id}`;
    const params = new URLSearchParams();
    
    if (template) {
      params.append('template', template);
    }
    if (!includeProofPages) {
      params.append('noProof', 'true');
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    router.push(url);
  };

  const generateQuickLink = (templateValue: string) => {
    const id = generateRandomId();
    let url = `/qr-sheet/${id}`;
    const params = new URLSearchParams();
    params.append('template', templateValue);
    if (!includeProofPages) {
      params.append('noProof', 'true');
    }
    return `${url}?${params.toString()}`;
  };

  const generateRandomId = () => {
    const words = [
      'happy', 'lucky', 'cyber', 'neon', 'pixel', 'matrix', 'crypto', 'digital',
      'hacker', 'ninja', 'robot', 'laser', 'quantum', 'binary', 'techno', 'glitch'
    ];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const randomNum = Math.floor(Math.random() * 9999);
    return `${randomWord}${randomNum}`;
  };

  const popularTemplates = [
    { label: 'Default (7×9)', value: '' },
    { label: 'Large (3×3)', value: '3x3' },
    { label: 'Medium (4×6)', value: '4x6' },
    { label: 'Small (6×8)', value: '6x8' },
    { label: 'Avery 5160', value: '5160' },
    { label: 'Avery 22816 (Square)', value: '22816' },
  ];

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">QR Sheet Generator</h1>
            <p className="text-small text-default-500">
              Generate printable QR code sheets with custom IDs and templates
            </p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="gap-6">
          {/* Custom ID Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">QR Code ID</label>
            <Input
              placeholder="Enter custom ID or leave blank for random"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              description="This will be part of the QR code URL: /qr/{id}"
              size="lg"
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Select Template</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {popularTemplates.map((tmpl) => (
                <Button
                  key={tmpl.value}
                  variant={template === tmpl.value ? 'solid' : 'bordered'}
                  color={template === tmpl.value ? 'primary' : 'default'}
                  onPress={() => setTemplate(tmpl.value)}
                  className="justify-start"
                >
                  {tmpl.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-default-400">
              Or enter a custom grid like "5x7" or Avery number like "5163"
            </p>
            <Input
              placeholder="Custom template (e.g., 5x7, 8160)"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              size="sm"
            />
          </div>

          {/* Proof Pages Option */}
          <div className="space-y-2">
            <Checkbox
              isSelected={includeProofPages}
              onValueChange={setIncludeProofPages}
            >
              <span className="font-semibold">Include Proof Pages</span>
            </Checkbox>
            <p className="text-xs text-default-400 ml-6">
              Adds pages 2-4 with large QR code and size comparison charts
            </p>
          </div>

          {/* Features List */}
          <div className="bg-default-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Your PDF will include:</h3>
            <ul className="text-sm space-y-1 text-default-600">
              <li>📄 Page 1: Grid of QR codes in your chosen template</li>
              {includeProofPages && (
                <>
                  <li>📄 Page 2: One large QR code for easy scanning</li>
                  <li>📄 Page 3-4: Size comparison chart showing different templates</li>
                </>
              )}
              <li>✂️ Dotted fold lines between QR codes (custom grids only)</li>
              <li>🏷️ Support for Avery label templates</li>
            </ul>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <Button
              color="primary"
              size="lg"
              onPress={handleGenerateSheet}
              className="px-8"
            >
              Generate QR Sheet
            </Button>
          </div>

          {/* Quota Info */}
          <div className="text-center text-sm text-default-400">
            <p>Each generation uses 1 QR sheet quota point</p>
          </div>
        </CardBody>
      </Card>

      {/* Quick Links Section */}
      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">Quick Generate Links</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="space-y-4">
            {/* Popular Grid Sizes */}
            <div>
              <h3 className="font-medium mb-2">Popular Grid Sizes</h3>
              <div className="flex flex-wrap gap-2">
                <Link href={generateQuickLink('4x5')} className="text-sm">
                  <Chip color="primary" variant="flat">4×5 Grid</Chip>
                </Link>
                <Link href={generateQuickLink('5x6')} className="text-sm">
                  <Chip color="primary" variant="flat">5×6 Grid</Chip>
                </Link>
                <Link href={generateQuickLink('6x8')} className="text-sm">
                  <Chip color="primary" variant="flat">6×8 Grid</Chip>
                </Link>
              </div>
            </div>

            {/* Popular Avery Templates */}
            <div>
              <h3 className="font-medium mb-2">Popular Avery Templates</h3>
              <div className="flex flex-wrap gap-2">
                <Link href={generateQuickLink('5160')} className="text-sm">
                  <Chip color="secondary" variant="flat">Avery 5160</Chip>
                </Link>
                <Link href={generateQuickLink('5163')} className="text-sm">
                  <Chip color="secondary" variant="flat">Avery 5163</Chip>
                </Link>
                <Link href={generateQuickLink('22816')} className="text-sm">
                  <Chip color="secondary" variant="flat">Avery 22816</Chip>
                </Link>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Avery Templates Reference */}
      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">All Supported Avery Templates</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <Link href={generateQuickLink('5160')}><strong>5160:</strong> Address labels (3×10, 2.625" × 1")</Link>
            <Link href={generateQuickLink('5163')}><strong>5163:</strong> Shipping labels (2×5, 4" × 2")</Link>
            <Link href={generateQuickLink('5164')}><strong>5164:</strong> Shipping labels (2×3, 4" × 3.33")</Link>
            <Link href={generateQuickLink('5167')}><strong>5167:</strong> Return address (4×20, 1.75" × 0.5")</Link>
            <Link href={generateQuickLink('5261')}><strong>5261:</strong> Address labels (2×10, 4" × 1")</Link>
            <Link href={generateQuickLink('5262')}><strong>5262:</strong> Address labels (2×7, 4" × 1.33")</Link>
            <Link href={generateQuickLink('8160')}><strong>8160:</strong> Address labels (3×10, 2.625" × 1")</Link>
            <Link href={generateQuickLink('22816')}><strong>22816:</strong> Square labels (3×6, 2.5" × 2.5")</Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}