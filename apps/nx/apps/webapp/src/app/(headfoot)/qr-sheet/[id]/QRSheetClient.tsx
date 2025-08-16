'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardBody, CardHeader, Divider, Button, Chip, Link, Checkbox, Input } from '@heroui/react';
import CardMatrixLoader from '@components/profile/CardMatrixLoader';

interface QRSheetClientProps {
  id: string;
  remainingQuota: number;
  userEmail: string;
}

export default function QRSheetClient({ id, remainingQuota, userEmail }: QRSheetClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(true);
  const [currentQuota, setCurrentQuota] = useState(remainingQuota);
  // Check if noProof parameter is set, default checkbox state accordingly
  const noProofParam = searchParams.get('noProof');
  const [includeProofPages, setIncludeProofPages] = useState(noProofParam !== 'true');
  
  // Get current template from URL params and set up manual template input
  const currentTemplate = searchParams.get('template') || '7x9'; // Default to 7x9 if no template
  const [manualTemplate, setManualTemplate] = useState(currentTemplate);
  
  // Base URL configuration - defaults to https://run.defcon.run/qr/ but can be overridden
  const defaultBaseUrl = 'https://run.defcon.run/qr/';
  const [baseUrl, setBaseUrl] = useState(searchParams.get('baseUrl') || defaultBaseUrl);

  // Helper function to generate quick links with current ID but different template
  const generateQuickLink = (newTemplate: string) => {
    const params = new URLSearchParams();
    params.append('template', newTemplate);
    // Quick links always default to no proof pages
    params.append('noProof', 'true');
    return `/qr-sheet/${id}?${params.toString()}`;
  };

  const downloadPDF = async () => {
    setIsDownloading(true);
    setError(null);
      try {
        const requestBody: any = {};
        
        if (manualTemplate.trim()) {
          requestBody.template = manualTemplate.trim();
        }
        if (!includeProofPages) {
          requestBody.noProof = true;
        }
        if (baseUrl && baseUrl !== defaultBaseUrl) {
          requestBody.baseUrl = baseUrl;
        }
        
        const response = await fetch(`/api/qr/sheet/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate PDF');
        }
        
        const blob = await response.blob();
        
        // Extract filename from Content-Disposition header if available
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `qr-sheet-${id}.pdf`; // default filename
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setIsDownloading(false);
        setCurrentQuota(prev => prev - 1);
      } catch (error) {
        console.error('Error downloading PDF:', error);
        setError(error instanceof Error ? error.message : 'Failed to download PDF');
        setIsDownloading(false);
      }
    };

  useEffect(() => {
    downloadPDF();
  }, [id, searchParams]);

  if (error) {
    return (
      <div className="container mx-auto py-8 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <h1 className="text-2xl font-bold text-danger">Error</h1>
          </CardHeader>
          <Divider />
          <CardBody className="text-center gap-4">
            <p className="text-default-600">{error}</p>
            <Button 
              as={Link}
              href="/"
              color="primary"
              variant="flat"
            >
              Return to Home
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">QR Sheet Generator</h1>
            <div className="text-default-600">
              Generating QR sheet for ID: <Chip variant="flat" size="sm">{id}</Chip>
            </div>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="gap-6">
          {isDownloading && (
            <CardMatrixLoader text="GENERATING QR SHEET" height="150px" />
          )}
          
          <div className="text-center">
            <p className="text-default-600">
              {isDownloading ? 'Your download should start automatically...' : 'Download complete!'}
            </p>
            <p className="text-sm text-default-400 mt-2">
              Remaining quota: {currentQuota}/10
            </p>
          </div>

          {!isDownloading && (
            <div className="space-y-4">
              {/* Base URL Input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-center">Base URL</label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={defaultBaseUrl}
                  size="sm"
                  className="mx-auto"
                  classNames={{
                    input: "text-sm font-mono",
                    inputWrapper: "min-h-8"
                  }}
                />
                <p className="text-xs text-default-400 text-center">
                  QR codes will link to: {baseUrl}{id}
                </p>
              </div>
              
              {/* Manual Template Input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-center">Template</label>
                <Input
                  value={manualTemplate}
                  onChange={(e) => setManualTemplate(e.target.value)}
                  placeholder="4x6"
                  maxLength={10}
                  size="lg"
                  className="max-w-24 mx-auto text-lg font-mono"
                  classNames={{
                    input: "text-center text-lg font-mono",
                    inputWrapper: "min-h-10"
                  }}
                />
                <p className="text-xs text-default-400 text-center">
                  Custom grid (4x6) or Avery (5160)
                </p>
              </div>
              
              {/* Proof Pages Checkbox */}
              <div className="flex justify-center">
                <Checkbox
                  isSelected={includeProofPages}
                  onValueChange={setIncludeProofPages}
                >
                  <span className="font-medium">Include Proof Pages</span>
                </Checkbox>
              </div>
              <p className="text-xs text-default-400 text-center">
                {includeProofPages 
                  ? "Includes pages 2-5: large QR, size comparison charts, and progressive data density test"
                  : "Only page 1 with the main QR grid will be generated"
                }
              </p>
              
              <div className="flex gap-3 justify-center">
                <Button
                  onPress={downloadPDF}
                  isDisabled={currentQuota <= 0}
                  color="primary"
                  size="lg"
                >
                  {currentQuota > 0 ? 'Generate Another Sheet' : 'Quota Exceeded'}
                </Button>
                <Button
                  onPress={() => router.push('/')}
                  variant="flat"
                  size="lg"
                >
                  Return to Home
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Quick Links Card */}
      <Card className="mt-6">
        <CardHeader>
          <h3 className="text-lg font-semibold">Quick Generate Links</h3>
        </CardHeader>
        <Divider />
        <CardBody className="gap-4">
          {/* Popular Grid Sizes */}
          <div>
            <h4 className="font-medium mb-2">Popular Grid Sizes:</h4>
            <div className="flex flex-wrap gap-2">
              <Link href={generateQuickLink('4x5')}>
                <Chip color="primary" variant="flat" size="sm">4×5 Grid</Chip>
              </Link>
              <Link href={generateQuickLink('5x6')}>
                <Chip color="primary" variant="flat" size="sm">5×6 Grid</Chip>
              </Link>
              <Link href={generateQuickLink('6x8')}>
                <Chip color="primary" variant="flat" size="sm">6×8 Grid</Chip>
              </Link>
            </div>
          </div>

          {/* Avery Templates */}
          <div>
            <h4 className="font-medium mb-2">Popular Avery Templates:</h4>
            <div className="flex flex-wrap gap-2">
              <Link href={generateQuickLink('5160')}>
                <Chip color="secondary" variant="flat" size="sm">Avery 5160</Chip>
              </Link>
              <Link href={generateQuickLink('5163')}>
                <Chip color="secondary" variant="flat" size="sm">Avery 5163</Chip>
              </Link>
              <Link href={generateQuickLink('22816')}>
                <Chip color="secondary" variant="flat" size="sm">Avery 22816</Chip>
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">All Supported Avery Templates:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
              <Link href={generateQuickLink('5160')} className="text-primary hover:underline">
                <strong>5160:</strong> Address labels (3×10, 2.625" × 1")
              </Link>
              <Link href={generateQuickLink('5163')} className="text-primary hover:underline">
                <strong>5163:</strong> Shipping labels (2×5, 4" × 2")
              </Link>
              <Link href={generateQuickLink('5164')} className="text-primary hover:underline">
                <strong>5164:</strong> Shipping labels (2×3, 4" × 3.33")
              </Link>
              <Link href={generateQuickLink('5167')} className="text-primary hover:underline">
                <strong>5167:</strong> Return address (4×20, 1.75" × 0.5")
              </Link>
              <Link href={generateQuickLink('5261')} className="text-primary hover:underline">
                <strong>5261:</strong> Address labels (2×10, 4" × 1")
              </Link>
              <Link href={generateQuickLink('5262')} className="text-primary hover:underline">
                <strong>5262:</strong> Address labels (2×7, 4" × 1.33")
              </Link>
              <Link href={generateQuickLink('8160')} className="text-primary hover:underline">
                <strong>8160:</strong> Address labels (3×10, 2.625" × 1")
              </Link>
              <Link href={generateQuickLink('22816')} className="text-primary hover:underline">
                <strong>22816:</strong> Square labels (3×6, 2.5" × 2.5")
              </Link>
            </div>
            <p className="text-sm text-default-400 mt-2">
              Custom grids also supported (e.g., "4x6")
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}