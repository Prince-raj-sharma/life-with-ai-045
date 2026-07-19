import React from "react";
import Link from "next/link";
import { GraduationCap, Mail, Phone, MapPin, Globe, Share2, MessageSquare, Code2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white pt-16 pb-12 border-t border-slate-800 w-full min-w-0 overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12 pb-12 border-b border-slate-800 w-full">
          {/* Logo & Description */}
          <div className="md:col-span-1 space-y-4 min-w-0">
            <Link href="/" className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center text-white shadow-md flex-shrink-0">
                <GraduationCap className="w-6 h-6 flex-shrink-0 self-center" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white leading-none truncate">
                LIFE WITH <span className="text-blue-400">AI</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed break-words">
              A premium online learning platform dedicated to empowering students with programming mastery and practical artificial intelligence skills.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4 min-w-0">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-200 truncate">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/courses" className="hover:text-white transition-colors block truncate">Browse Courses</Link></li>
              <li><Link href="/pdf-store" className="hover:text-white transition-colors block truncate">PDF Store & Ebooks</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors block truncate">About Us</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors block truncate">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors block truncate">Contact Support</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4 min-w-0">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-200 truncate">Legal & Policies</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors block truncate">Privacy Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white transition-colors block truncate">Refund Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors block truncate">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact Info & Socials */}
          <div className="space-y-4 min-w-0">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-200 truncate">Contact Us</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center space-x-3 min-w-0">
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0 self-center" />
                <span className="truncate">lifewith60@gmail.com</span>
              </li>
              <li className="flex items-center space-x-3 min-w-0">
                <Phone className="w-4 h-4 text-blue-400 flex-shrink-0 self-center" />
                <span className="truncate">@Mad_Max_mx</span>
              </li>
              <li className="flex items-start space-x-3 min-w-0">
                <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
                <span className="break-words">Tech Park, Bangalore, Karnataka, India</span>
              </li>
            </ul>

            <div className="pt-2 flex items-center space-x-3">
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-[#1D4ED8] flex items-center justify-center text-slate-300 hover:text-white transition-colors flex-shrink-0" aria-label="Website">
                <Globe className="w-4 h-4 flex-shrink-0 self-center" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-[#1D4ED8] flex items-center justify-center text-slate-300 hover:text-white transition-colors flex-shrink-0" aria-label="Community">
                <Share2 className="w-4 h-4 flex-shrink-0 self-center" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-[#1D4ED8] flex items-center justify-center text-slate-300 hover:text-white transition-colors flex-shrink-0" aria-label="Forum">
                <MessageSquare className="w-4 h-4 flex-shrink-0 self-center" />
              </a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-[#1D4ED8] flex items-center justify-center text-slate-300 hover:text-white transition-colors flex-shrink-0" aria-label="Code">
                <Code2 className="w-4 h-4 flex-shrink-0 self-center" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 text-center sm:text-left">
          <p>© {new Date().getFullYear()} LIFE WITH AI. All rights reserved.</p>
          <p>Built for Commercial EdTech Excellence</p>
        </div>
      </div>
    </footer>
  );
}
