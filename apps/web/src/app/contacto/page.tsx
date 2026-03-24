"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useState } from "react";

export default function Contacto() {
    const [formState, setFormState] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    });
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        // Simulate API call
        setTimeout(() => setStatus("success"), 1500);
    };

    return (
        <main className="min-h-screen bg-[#111214] text-gray-300">
            <Navbar />
            
            <section className="relative pt-32 pb-20 overflow-hidden text-center">
                <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary-turquoise/10 to-transparent blur-[120px] -z-10"></div>
                <div className="container mx-auto px-6 max-w-4xl">
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Estamos aquí para ayudarte</h2>
                    <p className="text-xl text-gray-400 leading-relaxed">
                        ¿Tienes dudas sobre nuestros productos o necesitas soporte técnico? Escríbenos y nuestro equipo te responderá a la brevedad.
                    </p>
                </div>
            </section>

            <section className="py-20">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
                        {/* Contact Info */}
                        <div className="space-y-12">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-6">Vías de contacto</h3>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary-turquoise/20 transition-all">
                                        <div className="w-12 h-12 rounded-xl bg-primary-turquoise/10 flex items-center justify-center text-primary-turquoise">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="M19 16v6"/><path d="M16 19h6"/></svg>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">Soporte por Email</h4>
                                            <a href="mailto:soporte@pawgo.pet" className="text-primary-turquoise hover:text-white transition-colors">soporte@pawgo.pet</a>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary-turquoise/20 transition-all">
                                        <div className="w-12 h-12 rounded-xl bg-primary-turquoise/10 flex items-center justify-center text-primary-turquoise">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">Redes Sociales</h4>
                                            <div className="flex gap-4 mt-1">
                                                <a href="https://instagram.com/pawgo.pet" target="_blank" rel="noopener noreferrer" className="hover:text-primary-turquoise transition-colors">Instagram</a>
                                                <span className="text-gray-700">•</span>
                                                <a href="https://www.facebook.com/share/14W1adqVQFx" target="_blank" rel="noopener noreferrer" className="hover:text-primary-turquoise transition-colors">Facebook</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="relative">
                            <div className="absolute -inset-4 bg-gradient-to-tr from-primary-turquoise/10 via-transparent to-primary-turquoise/5 blur-3xl -z-10"></div>
                            <div className="bg-[#1a1c1e] p-8 md:p-12 rounded-3xl border border-white/10 shadow-2xl">
                                {status === "success" ? (
                                    <div className="text-center py-10 space-y-6 animate-in fade-in zoom-in duration-500">
                                        <div className="w-20 h-20 bg-primary-turquoise/20 rounded-full flex items-center justify-center mx-auto text-primary-turquoise">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-white">¡Mensaje Enviado!</h3>
                                        <p className="text-gray-400">Gracias por contactarnos. Nuestro equipo te responderá muy pronto.</p>
                                        <button 
                                            onClick={() => setStatus("idle")}
                                            className="text-primary-turquoise hover:underline text-sm font-medium"
                                        >
                                            Enviar otro mensaje
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-400 ml-1">Nombre</label>
                                                <input 
                                                    required
                                                    type="text" 
                                                    className="w-full bg-white/5 border border-white/10 focus:border-primary-turquoise focus:ring-1 focus:ring-primary-turquoise rounded-xl px-5 py-4 outline-none transition-all placeholder:text-gray-600"
                                                    placeholder="Ej: Juan Pérez"
                                                    value={formState.name}
                                                    onChange={(e) => setFormState({...formState, name: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-400 ml-1">Email</label>
                                                <input 
                                                    required
                                                    type="email" 
                                                    className="w-full bg-white/5 border border-white/10 focus:border-primary-turquoise focus:ring-1 focus:ring-primary-turquoise rounded-xl px-5 py-4 outline-none transition-all placeholder:text-gray-600"
                                                    placeholder="juan@ejemplo.com"
                                                    value={formState.email}
                                                    onChange={(e) => setFormState({...formState, email: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400 ml-1">Asunto</label>
                                            <input 
                                                required
                                                type="text" 
                                                className="w-full bg-white/5 border border-white/10 focus:border-primary-turquoise focus:ring-1 focus:ring-primary-turquoise rounded-xl px-5 py-4 outline-none transition-all placeholder:text-gray-600"
                                                placeholder="¿En qué podemos ayudarte?"
                                                value={formState.subject}
                                                onChange={(e) => setFormState({...formState, subject: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400 ml-1">Mensaje</label>
                                            <textarea 
                                                required
                                                rows={5}
                                                className="w-full bg-white/5 border border-white/10 focus:border-primary-turquoise focus:ring-1 focus:ring-primary-turquoise rounded-xl px-5 py-4 outline-none transition-all placeholder:text-gray-600 resize-none"
                                                placeholder="Escribe tu mensaje aquí..."
                                                value={formState.message}
                                                onChange={(e) => setFormState({...formState, message: e.target.value})}
                                            ></textarea>
                                        </div>
                                        <button 
                                            disabled={status === "loading"}
                                            type="submit"
                                            className="w-full bg-primary-turquoise hover:bg-primary-turquoise-dark text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary-turquoise/20 disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {status === "loading" ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Enviando...</span>
                                                </>
                                            ) : (
                                                <span>Enviar Mensaje</span>
                                            )}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
