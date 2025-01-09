import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Divider,
  Card,
  CardContent,
  CardActions,
  Paper,
} from "@mui/material";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Download as DownloadIcon, Upload as UploadIcon } from "lucide-react";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const FormatSlips = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setFileName(file.name);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };
  const handleDownload = async () => {
    if (!pdfFile) return;
  
    try {
      const pdf = await pdfjs.getDocument(URL.createObjectURL(pdfFile)).promise;
      const { PDFDocument } = await import("pdf-lib");
      const newPdf = await PDFDocument.create();
  
      // Dimensions A4 en points
      const A4_WIDTH = 595.276;
      const A4_HEIGHT = 841.890;
      const MARGIN = 10;
  
      const ITEM_WIDTH = (A4_WIDTH - 3 * MARGIN) / 2;
      const ITEM_HEIGHT = (A4_HEIGHT - 3 * MARGIN);
  
      for (let i = 0; i < pdf.numPages; i += 4) {
        const newPage = newPdf.addPage([A4_WIDTH, A4_HEIGHT]);
  
        for (let j = 0; j < 4 && i + j < pdf.numPages; j++) {
          const page = await pdf.getPage(i + j + 1);
          const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better resolution
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
  
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
  
            const imageBytes = await new Promise<Uint8Array>((resolve) => {
              canvas.toBlob(async (blob) => {
                if (blob) {
                  const arrayBuffer = await blob.arrayBuffer();
                  resolve(new Uint8Array(arrayBuffer));
                }
              }, "image/png");
            });
  
            const image = await newPdf.embedPng(imageBytes);
  
            const row = Math.floor(j / 2);
            const col = j % 2;
            const x = MARGIN + col * (ITEM_WIDTH + MARGIN);
            const y = A4_HEIGHT - MARGIN - (row + 1) * (ITEM_HEIGHT + MARGIN);
  
            newPage.drawImage(image, {
              x,
              y,
              width: ITEM_WIDTH,
              height: ITEM_HEIGHT,
            });
          }
        }
      }
  
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
  
      const link = document.createElement("a");
      link.href = url;
      link.download = `formatted-${fileName}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error processing PDF:", error);
      alert("An error occurred while processing the PDF.");
    }
  };
    

  return (
    <Box padding={3} maxWidth="800px" mx="auto">
      <Typography variant="h4" gutterBottom textAlign="center" fontWeight="bold">
        Format Delivery Slips
      </Typography>

      <Divider sx={{ marginY: 3 }} />

      <Paper
        variant="outlined"
        sx={{
          padding: 3,
          borderRadius: 2,
          textAlign: "center",
          border: "1px dashed",
          backgroundColor: "#f9f9f9",
        }}
      >
        <UploadIcon style={{ fontSize: 48, color: "#888" }} />
        <Typography variant="body1" color="textSecondary" sx={{ marginY: 2 }}>
          Select a PDF file to format:
        </Typography>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadIcon />}
          color="primary"
        >
          Choose File
          <input
            type="file"
            hidden
            onChange={handleFileChange}
            accept=".pdf"
          />
        </Button>
      </Paper>

      {pdfFile && (
        <>
          <Card variant="outlined" sx={{ marginTop: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Selected File: <strong>{fileName}</strong>
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                onClick={handleDownload}
                startIcon={<DownloadIcon />}
                variant="contained"
                color="success"
                fullWidth
              >
                Download Formatted PDF
              </Button>
            </CardActions>
          </Card>

          <Box sx={{ marginTop: 3 }}>
            <Typography variant="h6" textAlign="center" gutterBottom>
              PDF Preview
            </Typography>
            <Document
              file={pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              className="flex flex-col items-center"
            >
              {Array.from(new Array(numPages), (_, index) => (
                <Box key={`page_${index + 1}`} sx={{ marginY: 2 }}>
                  <Page pageNumber={index + 1} scale={1.2} />
                </Box>
              ))}
            </Document>
          </Box>
        </>
      )}
    </Box>
  );
};

export default FormatSlips;
