import type { Route } from "./+types/home";
import NavBar from "~/Components/NavBar";
import {resumes} from "../../constants";
import ResumeCard from "~/components/ResumeCard";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "ResuMate" },
        { name: "description", content: "Smart Feedback For Your Dream Job!" },
    ];
}
export default function Home() {
    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover items-center justify-center">
            <NavBar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Track Your Applications & Resume Ratings</h1>
                    <h2>Review your submissions and check AI-Powered Feedback</h2>
                </div>

                {resumes.length > 0 && (
                    <div>
                        {resumes.map((resume) => (
                            <ResumeCard key={resume.id} resume={resume}/>
                        ))}
                    </div>
                )}
            </section>

        </main>
    )
}
