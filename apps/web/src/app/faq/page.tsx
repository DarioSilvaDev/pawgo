"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useState } from "react";

const FAQ_DATA = [
    {
        category: "Producto",
        questions: [
            { q: "¿Cómo funciona la correa retráctil integrada?", a: "Nuestra correa retráctil está integrada directamente en la estructura del arnés. Se extiende hasta 1.3 metros y se bloquea automáticamente por seguridad. Cuando no se usa, queda oculta y segura dentro del arnés." },
            { q: "¿Es seguro para perros que tiran mucho?", a: "Sí, el arnés PawGo está diseñado con materiales de alta resistencia y costuras reforzadas. El sistema de bloqueo automático de la correa soporta tirones fuertes sin comprometer la integridad del producto ni de tu peludito." },
            { q: "¿De qué materiales está hecho?", a: "Utilizamos nylon de alta densidad, herrajes de acero inoxidable y un forro interior de mesh transpirable para mayor confort de tu peludito." }
        ]
    },
    {
        category: "Envíos y Entregas",
        questions: [
            { q: "¿A qué zonas de Argentina realizan envíos?", a: "Realizamos envíos a todo el territorio argentino a través de Correo Argentino." },
            { q: "¿Cuál es el tiempo estimado de entrega?", a: "Una vez procesado el pedido, la entrega demora entre 3 a 7 días hábiles, dependiendo de tu ubicación geográfica." }
        ]
    },
    {
        category: "Garantía y Devoluciones",
        questions: [
            { q: "¿Qué garantía tienen los productos?", a: "Todos nuestros productos cuentan con una garantía de 6 meses por defectos de fabricación." },
            { q: "¿Puedo cambiar el talle si no le queda bien?", a: "¡Claro! Tienes 7 días desde que recibes el producto para solicitar un cambio de talle, siempre que el producto esté en su estado original y sin uso." }
        ]
    }
];

function AccordionItem({ question, answer, isOpen, onClick }: { question: string, answer: string, isOpen: boolean, onClick: () => void }) {
    return (
        <div className={`border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? "bg-white/5 border-primary-turquoise/30 shadow-lg shadow-primary-turquoise/5" : "bg-[#1a1c1e] hover:border-white/10"}`}>
            <button
                onClick={onClick}
                className="w-full px-8 py-6 flex items-center justify-between text-left group"
            >
                <span className={`text-lg font-semibold transition-colors ${isOpen ? "text-primary-turquoise" : "text-white group-hover:text-primary-turquoise"}`}>
                    {question}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? "bg-primary-turquoise text-white rotate-180" : "bg-white/5 text-gray-500"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="px-8 pb-8 text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                    {answer}
                </div>
            </div>
        </div>
    );
}

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<string | null>("0-0");

    const toggle = (id: string) => {
        setOpenIndex(openIndex === id ? null : id);
    };

    return (
        <main className="min-h-screen bg-[#111214] text-gray-300">
            <Navbar />

            <section className="relative pt-32 pb-20 overflow-hidden text-center">
                <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary-turquoise/10 to-transparent blur-[120px] -z-10"></div>
                <div className="container mx-auto px-6 max-w-4xl">
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Preguntas Frecuentes</h2>
                    <p className="text-xl text-gray-400 leading-relaxed">
                        Encuentra respuestas rápidas sobre nuestros productos, envíos y políticas de cambio.
                    </p>
                </div>
            </section>

            <section className="py-20">
                <div className="container mx-auto px-6 max-w-4xl space-y-16">
                    {FAQ_DATA.map((cat, catIdx) => (
                        <div key={catIdx} className="space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-primary-turquoise/60 border-l-2 border-primary-turquoise pl-4 mb-8">
                                {cat.category}
                            </h3>
                            <div className="space-y-4">
                                {cat.questions.map((q, qIdx) => {
                                    const id = `${catIdx}-${qIdx}`;
                                    return (
                                        <AccordionItem
                                            key={qIdx}
                                            question={q.q}
                                            answer={q.a}
                                            isOpen={openIndex === id}
                                            onClick={() => toggle(id)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 border-t border-white/5">
                <div className="container mx-auto px-6 text-center max-w-3xl">
                    <h3 className="text-2xl font-bold text-white mb-4">¿No encontraste lo que buscabas?</h3>
                    <p className="text-gray-400 mb-8">Escríbenos directamente y resolveremos tus dudas en menos de 24 horas.</p>
                    <a href="/contacto" className="inline-flex items-center gap-2 bg-primary-turquoise hover:bg-primary-turquoise-dark text-white font-bold px-8 py-4 rounded-full transition-all shadow-lg shadow-primary-turquoise/20">
                        Ir a Contacto
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                    </a>
                </div>
            </section>

            <Footer />
        </main>
    );
}
