import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata = {
  title: 'NoSpoiler - Universal Content & Spoiler Blurring (MERN + React)',
  description: 'MERN stack and React-powered platform and Chrome Extension that blurs GTA 6, movie leaks, and spoilers across the web.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
