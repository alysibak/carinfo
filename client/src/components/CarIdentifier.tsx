import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as mobilenet from '@tensorflow-models/mobilenet';
import '@tensorflow/tfjs';

interface Detection {
  class: string;
  score: number;
  bbox?: number[];
}

interface ColorInfo {
  hex: string;
  name: string;
}

export default function CarIdentifier() {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [dominantColor, setDominantColor] = useState<ColorInfo | null>(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      // Cleanup webcam on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const extractDominantColor = (img: HTMLImageElement): ColorInfo => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Sample every 10th pixel for performance
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 40) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    const name = getColorName(r, g, b);

    return { hex, name };
  };

  const getColorName = (r: number, g: number, b: number): string => {
    // Simple color classification
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    if (diff < 30) {
      if (max < 80) return 'Black';
      if (max > 200) return 'White';
      return 'Silver';
    }

    if (r > g && r > b) return 'Red';
    if (g > r && g > b) return 'Green';
    if (b > r && b > g) return 'Blue';
    if (r > 150 && g > 150 && b < 100) return 'Yellow';
    if (r > 150 && g < 100 && b > 150) return 'Purple';

    return 'Multi-Color';
  };

  const analyzeImage = async (imgElement: HTMLImageElement) => {
    setScanning(true);
    setDetections([]);

    try {
      // Extract dominant color
      const color = extractDominantColor(imgElement);
      setDominantColor(color);

      // Load COCO-SSD for object detection
      const cocoModel = await cocoSsd.load();
      const predictions = await cocoModel.detect(imgElement);

      // Filter for car-related objects
      const carPredictions = predictions.filter(p =>
        p.class === 'car' || p.class === 'truck' || p.class === 'bus'
      );

      if (carPredictions.length > 0) {
        // Found cars! Now classify with MobileNet for more detail
        const mobileModel = await mobilenet.load();
        const classification = await mobileModel.classify(imgElement);

        // Combine detections
        const combined: Detection[] = [
          ...carPredictions.map(p => ({
            class: mapCarClass(p.class),
            score: p.score,
            bbox: p.bbox,
          })),
          ...classification
            .filter(c => c.probability > 0.1)
            .slice(0, 3)
            .map(c => ({
              class: c.className,
              score: c.probability,
            })),
        ];

        setDetections(combined);
      } else {
        // No car detected, fallback to MobileNet
        const mobileModel = await mobilenet.load();
        const classification = await mobileModel.classify(imgElement);

        setDetections(
          classification
            .filter(c => c.probability > 0.1)
            .map(c => ({
              class: c.className,
              score: c.probability,
            }))
        );
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
    } finally {
      setScanning(false);
    }
  };

  const mapCarClass = (className: string): string => {
    const mapping: Record<string, string> = {
      'car': 'sedan',
      'truck': 'truck',
      'bus': 'van',
      'sports_car': 'sports car',
      'convertible': 'convertible',
      'suv': 'suv',
    };
    return mapping[className.toLowerCase()] || className;
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      setImage(imgUrl);

      // Create image element and analyze
      const img = new Image();
      img.onload = () => analyzeImage(img);
      img.src = imgUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleWebcam = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setUseWebcam(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
      });
      setStream(mediaStream);
      setUseWebcam(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      alert('Could not access camera. Please ensure camera permissions are enabled.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    const imgUrl = canvas.toDataURL('image/jpeg');
    setImage(imgUrl);
    setUseWebcam(false);

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    // Analyze captured image
    const img = new Image();
    img.onload = () => analyzeImage(img);
    img.src = imgUrl;
  };

  const searchByDetection = (className: string) => {
    // Map detected class to search query
    const searchTerms = className.toLowerCase();
    navigate(`/smart-search?search=${encodeURIComponent(searchTerms)}`);
  };

  return (
    <div className="min-h-screen bg-black text-white py-16 px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black tracking-tighter mb-4">
            VISUAL SEARCH
          </h1>
          <p className="text-xl tracking-wider text-zinc-600 uppercase">
            See a car you love? Snap it to find it.
          </p>
        </div>

        {/* Upload Area */}
        {!useWebcam && !image && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed ${
              dragActive ? 'border-white bg-zinc-950' : 'border-zinc-800'
            } transition-all duration-300 p-16 text-center mb-8 relative group hover:border-zinc-600`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
              className="hidden"
            />

            <svg
              className="w-24 h-24 mx-auto mb-6 text-zinc-800 group-hover:text-zinc-600 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>

            <p className="text-2xl font-black tracking-tight mb-2 uppercase">
              Drop an image here
            </p>
            <p className="text-sm tracking-widest text-zinc-700 mb-6">
              OR
            </p>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-black px-8 py-4 font-black tracking-widest text-sm hover:bg-zinc-300 transition-all"
              >
                BROWSE FILES
              </button>

              <button
                onClick={handleWebcam}
                className="bg-zinc-900 border border-zinc-700 px-8 py-4 font-black tracking-widest text-sm hover:bg-zinc-800 transition-all"
              >
                USE CAMERA
              </button>
            </div>
          </div>
        )}

        {/* Webcam View */}
        {useWebcam && (
          <div className="relative mb-8">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-auto bg-black"
            />
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white border-4 border-black hover:bg-zinc-300 transition-all"
              >
                <div className="w-full h-full rounded-full border-2 border-black" />
              </button>
              <button
                onClick={handleWebcam}
                className="bg-red-600 text-white px-6 py-3 font-black tracking-widest text-xs hover:bg-red-700 transition-all"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* Image Preview & Analysis */}
        {image && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Image */}
            <div className="relative group">
              <img src={image} alt="Uploaded" className="w-full h-auto border border-zinc-800" />

              {/* Scanning Overlay */}
              {scanning && (
                <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block w-16 h-16 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-4" />
                    <p className="text-xs tracking-[0.3em] text-zinc-700 uppercase animate-pulse">
                      Analyzing Image...
                    </p>
                    <div className="mt-4 w-64 h-1 bg-zinc-900 overflow-hidden">
                      <div className="h-full bg-white animate-scan" />
                    </div>
                  </div>
                </div>
              )}

              {/* Color Badge */}
              {dominantColor && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black bg-opacity-90 px-4 py-2 border border-zinc-800">
                  <div
                    className="w-6 h-6 border border-zinc-700"
                    style={{ backgroundColor: dominantColor.hex }}
                  />
                  <span className="text-xs tracking-widest font-bold">{dominantColor.name}</span>
                </div>
              )}
            </div>

            {/* Results */}
            <div>
              <h2 className="text-2xl font-black tracking-tight mb-6 uppercase">
                Detection Results
              </h2>

              {detections.length === 0 && !scanning && (
                <p className="text-zinc-600 tracking-wider">
                  No detections yet. Upload an image to start.
                </p>
              )}

              <div className="space-y-3">
                {detections.map((detection, index) => (
                  <div
                    key={index}
                    onClick={() => searchByDetection(detection.class)}
                    className="bg-zinc-950 border border-zinc-900 p-4 hover:border-zinc-700 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-black tracking-tight uppercase group-hover:tracking-wide transition-all">
                        {detection.class}
                      </h3>
                      <span className="text-xs tracking-widest text-zinc-700">
                        {Math.round(detection.score * 100)}% CONFIDENCE
                      </span>
                    </div>

                    {/* Confidence Bar */}
                    <div className="h-1 bg-zinc-900 overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-1000"
                        style={{ width: `${detection.score * 100}%` }}
                      />
                    </div>

                    {/* Search CTA */}
                    <div className="mt-3 flex items-center gap-2 text-xs tracking-widest text-zinc-700 group-hover:text-white transition-all">
                      <span>SEARCH FOR THIS</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

              {detections.length > 0 && (
                <button
                  onClick={() => {
                    setImage(null);
                    setDetections([]);
                    setDominantColor(null);
                  }}
                  className="mt-6 w-full bg-zinc-900 border border-zinc-800 px-6 py-4 font-black tracking-widest text-sm hover:bg-zinc-800 transition-all"
                >
                  ANALYZE ANOTHER IMAGE
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hidden canvas for webcam capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* How It Works */}
        <div className="mt-16 pt-16 border-t border-zinc-900">
          <h2 className="text-3xl font-black tracking-tight mb-8 text-center uppercase">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                <span className="text-2xl font-black">1</span>
              </div>
              <h3 className="text-lg font-black tracking-tight mb-2 uppercase">
                Capture or Upload
              </h3>
              <p className="text-sm tracking-wider text-zinc-600">
                Take a photo with your camera or upload an existing image
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                <span className="text-2xl font-black">2</span>
              </div>
              <h3 className="text-lg font-black tracking-tight mb-2 uppercase">
                AI Analysis
              </h3>
              <p className="text-sm tracking-wider text-zinc-600">
                Our neural network identifies the car type, features, and color
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                <span className="text-2xl font-black">3</span>
              </div>
              <h3 className="text-lg font-black tracking-tight mb-2 uppercase">
                Find Matches
              </h3>
              <p className="text-sm tracking-wider text-zinc-600">
                Browse our database for similar vehicles and alternatives
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .animate-scan {
          animation: scan 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
