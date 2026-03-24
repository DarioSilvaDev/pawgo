
import Link from 'next/link';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[#1a1c1e] text-gray-300 py-16 border-t border-white/5 relative overflow-hidden">
            {/* Ambient Background Effect */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-turquoise/5 blur-[120px] -z-10 rounded-full"></div>

            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand Section */}
                    <div className="flex flex-col gap-6 items-center md:items-start text-center md:text-left">
                        <Link href="/" className="group">
                            <h3 className="text-3xl font-bold bg-gradient-to-r from-primary-turquoise to-primary-turquoise-light bg-clip-text text-transparent transition-all duration-300 group-hover:tracking-wider">
                                PawGo
                            </h3>
                        </Link>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                            Equipamiento premium para tus aventuras. Calidad, diseño y confort para tu mejor amigo.
                        </p>
                        <Link
                            href="https://www.pawgo-pet.com/comunidad"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-white bg-white/5 hover:bg-primary-turquoise/10 border border-white/10 hover:border-primary-turquoise/30 px-4 py-2 rounded-full text-sm transition-all duration-300"
                        >
                            <span>Nuestra comunidad</span>
                            <span className="text-lg">🐾</span>
                        </Link>
                    </div>

                    {/* Quick Links */}
                    <div className="flex flex-col gap-6 items-center md:items-start text-center md:text-left">
                        <h4 className="text-white font-semibold uppercase tracking-wider text-xs">Explorar</h4>
                        <nav className="flex flex-col gap-3">
                            <Link href="/" className="hover:text-primary-turquoise transition-colors duration-200">Inicio</Link>
                            <Link href="/nosotros" className="hover:text-primary-turquoise transition-colors duration-200">Nosotros</Link>
                            <Link href="/contacto" className="hover:text-primary-turquoise transition-colors duration-200">Contacto</Link>
                            <Link href="/faq" className="hover:text-primary-turquoise transition-colors duration-200">Preguntas Frecuentes</Link>
                        </nav>
                    </div>

                    {/* Social & Contact */}
                    <div className="flex flex-col gap-6 items-center md:items-start text-center md:text-left">
                        <h4 className="text-white font-semibold uppercase tracking-wider text-xs">Síguenos</h4>
                        <div className="flex gap-4">
                            {/* Instagram */}
                            <Link
                                href="https://instagram.com/pawgo.pet"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-primary-turquoise hover:text-white border border-white/10 transition-all duration-300 hover:-translate-y-1"
                                aria-label="Instagram"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                                </svg>
                            </Link>
                            {/* Facebook */}
                            <Link
                                href="https://www.facebook.com/share/14W1adqVQFx"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-primary-turquoise hover:text-white border border-white/10 transition-all duration-300 hover:-translate-y-1"
                                aria-label="Facebook"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                                </svg>
                            </Link>
                        </div>
                        <div className="pt-2">
                            <p className="text-xs text-gray-500">¿Dudas? Escríbenos a:</p>
                            <a href="mailto:soporte@pawgo.pet" className="text-sm text-gray-400 hover:text-primary-turquoise transition-colors">soporte@pawgo.pet</a>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                    <p className="text-gray-500 text-xs">
                        &copy; {currentYear} PawGo. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}
