import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploaderProps {
    onFileSelect?: (file: File | null) => void;
}

const maxFileSize = 20 * 1024 * 1024; // 20MB

const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + "MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + "KB";
    return bytes + " bytes";
};

const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
    const [file, setFile] = useState<File | null>(null);

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            const selectedFile = acceptedFiles[0] || null;
            setFile(selectedFile);
            onFileSelect?.(selectedFile);
        },
        [onFileSelect]
    );

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        multiple: false,
        accept: { "application/pdf": [".pdf"] },
        maxSize: maxFileSize,
        noClick: false,
        noKeyboard: false,
    });

    // Proper remove handler
    const removeFile = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Prevent triggering dropzone click
        setFile(null);
        onFileSelect?.(null);
    };

    return (
        <div className="w-full gradient-border">
            <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                <div className="space-y-4">
                    {file ? (
                        <div
                            className="uploader-selected-file"
                            onClick={(e) => e.stopPropagation()} // prevent parent click
                        >
                            <img src="/images/pdf.png" alt="pdf" className="size-10" />
                            <div className="flex items-center space-x-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                                        {file.name}
                                    </p>
                                    <p className="text-sm text-gray-500">{formatSize(file.size)}</p>
                                </div>
                                <button className="p-2 cursor-pointer" onClick={removeFile}>
                                    <img src="/icons/cross.svg" alt="remove" className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="mx-auto w-16 h-16 flex items-center justify-center mb-2">
                                <img src="/icons/info.svg" alt="upload" className="size-20" />
                            </div>
                            <p className="text-lg text-gray-500">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-lg text-gray-500">PDF (max {formatSize(maxFileSize)})</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileUploader;
