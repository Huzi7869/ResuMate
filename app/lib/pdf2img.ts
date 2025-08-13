export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    try {
        // Dynamically import only in browser
        loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
            // Use the matching worker version from the same package
            lib.GlobalWorkerOptions.workerSrc = new URL(
                'pdfjs-dist/build/pdf.worker.min.mjs',
                import.meta.url
            ).toString();
            pdfjsLib = lib;
            return lib;
        });

        return loadPromise;
    } catch (error) {
        console.error("Failed to load PDF.js:", error);
        throw new Error("Failed to load PDF.js library");
    }
}

export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
    // ✅ Stop immediately if running on the server
    if (typeof window === "undefined" || typeof document === "undefined") {
        return {
            imageUrl: "",
            file: null,
            error: "PDF conversion only works in the browser.",
        };
    }

    // Validate file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        return {
            imageUrl: "",
            file: null,
            error: "File must be a PDF document.",
        };
    }

    // Check file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        return {
            imageUrl: "",
            file: null,
            error: "PDF file is too large. Maximum size is 50MB.",
        };
    }

    try {
        console.log("Starting PDF conversion for:", file.name);
        const lib = await loadPdfJs();

        const arrayBuffer = await file.arrayBuffer();
        console.log("PDF file loaded, size:", arrayBuffer.byteLength);

        // Load the PDF document
        const loadingTask = lib.getDocument({
            data: arrayBuffer,
            verbosity: 0 // Reduce console output
        });

        const pdf = await loadingTask.promise;
        console.log("PDF loaded successfully, pages:", pdf.numPages);

        // Get the first page
        const page = await pdf.getPage(1);
        console.log("Got first page");

        // Set scale for good quality but reasonable file size
        const scale = 2.0; // Reduced from 4 to improve performance
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Could not get 2D canvas context");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        console.log("Canvas setup complete, rendering...");

        // Render the page
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;
        console.log("Page rendered successfully");

        // Convert canvas to blob
        return await new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        console.error("Failed to create blob from canvas");
                        resolve({
                            imageUrl: "",
                            file: null,
                            error: "Failed to create image blob from PDF",
                        });
                        return;
                    }

                    const originalName = file.name.replace(/\.pdf$/i, "");
                    const imageFile = new File([blob], `${originalName}.png`, {
                        type: "image/png",
                        lastModified: Date.now()
                    });

                    console.log("Conversion successful, image size:", blob.size);

                    resolve({
                        imageUrl: URL.createObjectURL(blob),
                        file: imageFile,
                    });
                },
                "image/png",
                0.9 // Slightly compress to reduce file size
            );
        });
    } catch (err) {
        console.error("PDF conversion error:", err);

        let errorMessage = "Failed to convert PDF";
        if (err instanceof Error) {
            errorMessage = err.message;
        } else {
            errorMessage = String(err);
        }

        // Handle specific error cases
        if (errorMessage.includes("Invalid PDF")) {
            errorMessage = "The uploaded file appears to be corrupted or is not a valid PDF.";
        } else if (errorMessage.includes("password")) {
            errorMessage = "Password-protected PDFs are not supported.";
        } else if (errorMessage.includes("worker")) {
            errorMessage = "PDF processing worker failed to load. Please try again.";
        }

        return {
            imageUrl: "",
            file: null,
            error: errorMessage,
        };
    }
}