import {type FormEvent, useState} from 'react'
import Navbar from "~/Components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";
import {convertPdfToImage} from "~/lib/pdf2img";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [errorText, setErrorText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file);
        setErrorText(''); // Clear any previous errors
    }

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) => {
        setIsProcessing(true);
        setErrorText('');

        try {
            setStatusText('Uploading the file...');
            const uploadedFile = await fs.upload([file]);
            if(!uploadedFile) {
                throw new Error('Failed to upload file');
            }

            setStatusText('Converting PDF to image...');
            const imageResult = await convertPdfToImage(file);

            // Check for conversion errors
            if (imageResult.error || !imageResult.file) {
                throw new Error(imageResult.error || 'Failed to convert PDF to image');
            }

            setStatusText('Uploading the converted image...');
            const uploadedImage = await fs.upload([imageResult.file]);
            if(!uploadedImage) {
                throw new Error('Failed to upload converted image');
            }

            setStatusText('Preparing data for analysis...');
            const uuid = generateUUID();
            const data = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName,
                jobTitle,
                jobDescription,
                feedback: '',
            }
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText('Analyzing your resume with AI...');
            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription })
            );

            if (!feedback) {
                throw new Error('Failed to analyze resume - AI service unavailable');
            }

            const feedbackText = typeof feedback.message.content === 'string'
                ? feedback.message.content
                : feedback.message.content[0].text;

            try {
                data.feedback = JSON.parse(feedbackText);
            } catch (parseError) {
                console.error('Failed to parse feedback:', parseError);
                data.feedback = { error: 'Failed to parse AI feedback', rawFeedback: feedbackText };
            }

            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setStatusText('Analysis complete! Redirecting...');

            console.log('Analysis completed successfully:', data);
            navigate(`/resume/${uuid}`);

        } catch (error) {
            console.error('Analysis failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setErrorText(errorMessage);
            setStatusText('');
        } finally {
            setIsProcessing(false);
        }
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;

        const formData = new FormData(form);
        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        // Validation
        if (!companyName.trim()) {
            setErrorText('Company name is required');
            return;
        }
        if (!jobTitle.trim()) {
            setErrorText('Job title is required');
            return;
        }
        if (!jobDescription.trim()) {
            setErrorText('Job description is required');
            return;
        }
        if (!file) {
            setErrorText('Please upload a PDF resume');
            return;
        }

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" alt="Processing..." />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}

                    {/* Error Display */}
                    {errorText && !isProcessing && (
                        <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
                            <strong>Error:</strong> {errorText}
                        </div>
                    )}

                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name *</label>
                                <input
                                    type="text"
                                    name="company-name"
                                    placeholder="e.g., Google, Microsoft, Startup Inc."
                                    id="company-name"
                                    required
                                />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title *</label>
                                <input
                                    type="text"
                                    name="job-title"
                                    placeholder="e.g., Software Engineer, Product Manager"
                                    id="job-title"
                                    required
                                />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description *</label>
                                <textarea
                                    rows={5}
                                    name="job-description"
                                    placeholder="Paste the full job description here..."
                                    id="job-description"
                                    required
                                />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume (PDF only) *</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                                {file && (
                                    <p className="text-sm text-gray-600 mt-2">
                                        Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                )}
                            </div>

                            <button
                                className="primary-button"
                                type="submit"
                                disabled={!file || isProcessing}
                            >
                                {isProcessing ? 'Processing...' : 'Analyze Resume'}
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}

export default Upload;