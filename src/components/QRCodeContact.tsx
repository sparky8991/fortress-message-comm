import { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, Copy, Download, UserPlus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Simple QR Code generator (uses an API for simplicity)
// In production, you might use a library like qrcode.react
const generateQRCodeUrl = (data: string, size: number = 200) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=1f2937&color=22c55e`;
};

interface ContactData {
  userId: string;
  userName: string;
  userEmail?: string;
  callSign?: string;
}

export const QRCodeContact = () => {
  const { user } = useAuth();
  const [myQRData, setMyQRData] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedContact, setScannedContact] = useState<ContactData | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (user) {
      const contactData: ContactData = {
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown',
        userEmail: user.email || undefined,
      };
      setMyQRData(JSON.stringify(contactData));
    }
  }, [user]);

  const copyContactLink = async () => {
    const link = `${window.location.origin}/add-contact?data=${encodeURIComponent(myQRData)}`;
    await navigator.clipboard.writeText(link);
    toast.success('Contact link copied!');
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = generateQRCodeUrl(myQRData, 400);
    link.download = 'my-contact-qr.png';
    link.click();
    toast.success('QR code downloaded!');
  };

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsScanning(true);
      scanQRCode();
    } catch (error) {
      toast.error('Could not access camera');
      console.error('Camera error:', error);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanQRCode);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // In production, you'd use a library like jsQR to decode
    // For demo, we'll simulate scanning
    // const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // const code = jsQR(imageData.data, imageData.width, imageData.height);

    requestAnimationFrame(scanQRCode);
  };

  const simulateScan = () => {
    // Simulate scanning a QR code for demo
    const mockContact: ContactData = {
      userId: 'mock_user_123',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      callSign: 'ALPHA-1',
    };

    setScannedContact(mockContact);
    stopScanning();
    toast.success('Contact scanned!');
  };

  const addScannedContact = async () => {
    if (!scannedContact) return;

    // Here you would add the contact to your database
    toast.success(`Added ${scannedContact.userName} to contacts!`);
    setScannedContact(null);
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <QrCode className="w-5 h-5 text-green-500" />
          QR Code Contact
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="my-code" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-700">
            <TabsTrigger value="my-code">My Code</TabsTrigger>
            <TabsTrigger value="scan">Scan</TabsTrigger>
          </TabsList>

          <TabsContent value="my-code" className="space-y-4">
            {/* QR Code Display */}
            <div className="flex justify-center p-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <img
                  src={generateQRCodeUrl(myQRData, 200)}
                  alt="My QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-white font-medium">{user?.displayName || user?.email}</p>
              <p className="text-gray-400 text-sm">Scan to add me as a contact</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-gray-600"
                onClick={copyContactLink}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-gray-600"
                onClick={downloadQRCode}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="scan" className="space-y-4">
            {scannedContact ? (
              // Show scanned contact
              <div className="space-y-4">
                <div className="p-4 bg-gray-700/50 rounded-lg text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <UserPlus className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-white font-medium text-lg">{scannedContact.userName}</p>
                  {scannedContact.callSign && (
                    <p className="text-green-400 text-sm">{scannedContact.callSign}</p>
                  )}
                  {scannedContact.userEmail && (
                    <p className="text-gray-400 text-sm">{scannedContact.userEmail}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-600"
                    onClick={() => setScannedContact(null)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={addScannedContact}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              </div>
            ) : isScanning ? (
              // Camera view
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Scan overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-green-500 rounded-lg">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg" />
                    </div>
                  </div>
                </div>

                <p className="text-gray-400 text-sm text-center">
                  Point your camera at a QR code
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-600"
                    onClick={stopScanning}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={simulateScan}
                  >
                    Simulate Scan
                  </Button>
                </div>
              </div>
            ) : (
              // Start scanning button
              <div className="text-center space-y-4 py-8">
                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-400">
                  Scan a contact's QR code to add them
                </p>
                <Button
                  onClick={startScanning}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Start Scanning
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default QRCodeContact;
