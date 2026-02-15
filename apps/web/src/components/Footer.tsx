
import Link from 'next/link';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[#4E585E] text-white py-12">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">

                    {/* Social Links */}
                    <div className="flex flex-col items-center md:items-end gap-4">
                        <span className="text-white font-medium">Síguenos en</span>
                        <div className="flex gap-6">
                            {/* Instagram */}
                            <Link
                                href="https://instagram.com/pawgo.pet"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white hover:text-primary-turquoise transition-colors"
                                aria-label="Instagram"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                                </svg>
                                <span className="sr-only">Instagram: @pawgo-pet</span>
                            </Link>

                            {/* Facebook */}
                            <Link
                                href="https://www.facebook.com/share/14W1adqVQFx"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white hover:text-primary-turquoise transition-colors"
                                aria-label="Facebook"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                                </svg>
                                <span className="sr-only">Facebook: @pawgo-pet</span>
                            </Link>
                        </div>
                    </div>
                    {/* Brand & Copyright */}
                    <div className="text-center md:text-left">
                        <h3 className="text-2xl font-bold text-primary-turquoise mb-2">
                            PawGo
                        </h3>
                        <p className="text-gray-400 text-sm">
                            &copy; {currentYear} PawGo. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
