"use client";

import { useRef, useState } from "react";
import Tesseract from "tesseract.js";

export default function LeaderboardOCR() {
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);

  // Handle image selection from input
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(URL.createObjectURL(file));
      // Pre-process and perform OCR
      preProcessImage(file).then((processedImage: any) => {
        performOCR(processedImage);
      });
    }
  };

  // Pre-process the image before OCR
  const preProcessImage = (file: any) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = canvasRef.current; // Use the canvas ref
        const ctx = canvas.getContext("2d");
        const MAX_SIZE = 1000;

        // Resize the image if necessary
        const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Draw the resized image on the canvas
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert the image to grayscale
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData?.data || [];

        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3; // Average of RGB
          data[i] = avg; // Red
          data[i + 1] = avg; // Green
          data[i + 2] = avg; // Blue
        }
        // @ts-ignore
        ctx?.putImageData(imageData, 0, 0);

        // Apply thresholding (binarization)
        // @ts-ignore
        applyThreshold(imageData.data, 150); // Threshold value 128 (can be adjusted)

        // @ts-ignore
        ctx.putImageData(imageData, 0, 0);

        // Convert the canvas to a data URL for displaying
        const processedImageUrl = canvas.toDataURL("image/png");
        setProcessedImageUrl(processedImageUrl); // Set the URL to display the processed image

        // Convert the canvas back to a Blob or File
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      };

      img.onerror = (err) => reject(err);
    });
  };

  // Apply thresholding (binarization)
  const applyThreshold = (data: any, threshold: any) => {
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const value = avg >= threshold ? 255 : 0; // Binarize (white/black)
      data[i] = data[i + 1] = data[i + 2] = value; // Set RGB to the same value
    }
  };

  // Perform OCR on the selected image
  const performOCR = (file: string) => {
    setLoading(true);

    Tesseract.recognize(file, "eng", {
      logger: (m) => console.log(m), // Log OCR progress
    })
      .then(({ data: { text } }) => {
        setOcrText(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  return (
    <div>
      <h1>Omega Strikers Leaderboard OCR</h1>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      {loading ? <p>Processing image...</p> : <p>Text: {ocrText}</p>}
      {imageFile && (
        <img
          src={imageFile}
          alt="Selected Screenshot"
          style={{ maxWidth: "400px", marginTop: "20px" }}
        />
      )}
      {processedImageUrl && (
        <div>
          <h2>Processed Image</h2>
          <img
            src={processedImageUrl}
            alt="Processed Image"
            style={{ maxWidth: "400px", marginTop: "20px" }}
          />
        </div>
      )}
      {/* Hidden canvas for image manipulation */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
