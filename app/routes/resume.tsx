import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import type { Route } from "./+types/resume";
import { usePuterStore } from '~/lib/puter';
import Navbar from '~/Components/Navbar';

interface FeedbackTip {
    type: 'good' | 'improve';
    tip: string;
    explanation?: string;
}

interface FeedbackSection {
    score: number;
    tips: FeedbackTip[];
}

interface ResumeData {
    id: string;
    resumePath: string;
    imagePath: string;
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    feedback: {
        overallScore: number;
        ATS: FeedbackSection;
        content: FeedbackSection;
        skills: FeedbackSection;
        structure: FeedbackSection;
        toneAndStyle: FeedbackSection;
    };
}

// This is the loader function that React Router v7 needs
export async function loader({ params }: Route.LoaderArgs) {
    // We'll load the data in the component instead since we need the Puter store
    return { id: params.id };
}

export default function Resume() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { kv, fs } = usePuterStore();
    const [resumeData, setResumeData] = useState<ResumeData | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const loadResumeData = async () => {
            if (!id) {
                setError('No resume ID provided');
                setLoading(false);
                return;
            }

            try {
                console.log('Loading resume data for ID:', id);

                // Load resume data from KV store
                const data = await kv.get(`resume:${id}`);
                if (!data) {
                    setError('Resume analysis not found');
                    setLoading(false);
                    return;
                }

                const parsedData: ResumeData = JSON.parse(data);
                console.log('Loaded resume data:', parsedData);
                setResumeData(parsedData);

                // Load image from file system
                try {
                    const imageBlob = await fs.read(parsedData.imagePath);
                    const imageObjectUrl = URL.createObjectURL(imageBlob);
                    setImageUrl(imageObjectUrl);
                    console.log('Image loaded successfully');
                } catch (imgError) {
                    console.error('Failed to load resume image:', imgError);
                    // Continue without image
                }

                setLoading(false);
            } catch (err) {
                console.error('Failed to load resume data:', err);
                setError('Failed to load resume analysis');
                setLoading(false);
            }
        };

        loadResumeData();
    }, [id, kv, fs]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreBackground = (score: number) => {
        if (score >= 80) return 'bg-green-100';
        if (score >= 60) return 'bg-yellow-100';
        return 'bg-red-100';
    };

    if (loading) {
        return (
            <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
                <Navbar />
                <div className="flex justify-center items-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-lg">Loading your resume analysis...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (error || !resumeData) {
        return (
            <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
                <Navbar />
                <div className="flex justify-center items-center min-h-[60vh]">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                        <p className="text-lg mb-4">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="primary-button"
                        >
                            Back to Upload
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />

            <section className="main-section">
                <div className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold mb-4">Resume Analysis Results</h1>
                        <div className="flex justify-center items-center gap-4 text-lg">
                            <span><strong>Company:</strong> {resumeData.companyName}</span>
                            <span className="text-gray-400">|</span>
                            <span><strong>Position:</strong> {resumeData.jobTitle}</span>
                        </div>
                    </div>

                    {/* Overall Score */}
                    <div className="text-center mb-8">
                        <div className={`inline-block px-8 py-4 rounded-lg ${getScoreBackground(resumeData.feedback.overallScore)}`}>
                            <h2 className="text-2xl font-bold mb-2">Overall ATS Score</h2>
                            <div className={`text-6xl font-bold ${getScoreColor(resumeData.feedback.overallScore)}`}>
                                {resumeData.feedback.overallScore}/100
                            </div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Resume Image */}
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold">Your Resume</h3>
                            {imageUrl ? (
                                <div className="bg-white p-4 rounded-lg shadow-lg">
                                    <img
                                        src={imageUrl}
                                        alt="Resume"
                                        className="w-full max-h-[800px] object-contain rounded"
                                    />
                                </div>
                            ) : (
                                <div className="bg-gray-100 p-8 rounded-lg text-center">
                                    <p className="text-gray-600">Resume image unavailable</p>
                                </div>
                            )}
                        </div>

                        {/* Analysis Results */}
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold">Detailed Analysis</h3>

                            {Object.entries(resumeData.feedback).map(([key, section]) => {
                                if (key === 'overallScore' || typeof section !== 'object') return null;

                                const sectionName = key === 'ATS' ? 'ATS Compatibility' :
                                    key === 'toneAndStyle' ? 'Tone & Style' :
                                        key.charAt(0).toUpperCase() + key.slice(1);

                                return (
                                    <div key={key} className="bg-white rounded-lg shadow-lg p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-xl font-semibold">{sectionName}</h4>
                                            <span className={`text-2xl font-bold ${getScoreColor(section.score)}`}>
                                                {section.score}/100
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {section.tips.map((tip, index) => (
                                                <div
                                                    key={index}
                                                    className={`p-3 rounded-lg border-l-4 ${
                                                        tip.type === 'good'
                                                            ? 'bg-green-50 border-green-500'
                                                            : 'bg-orange-50 border-orange-500'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                                            tip.type === 'good' ? 'bg-green-500' : 'bg-orange-500'
                                                        }`}>
                                                            {tip.type === 'good' ? '✓' : '!'}
                                                        </span>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{tip.tip}</p>
                                                            {tip.explanation && (
                                                                <p className="text-sm text-gray-600 mt-1">{tip.explanation}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="text-center mt-8 space-x-4">
                        <button
                            onClick={() => navigate('/')}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Analyze Another Resume
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="primary-button"
                        >
                            Print Results
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}
