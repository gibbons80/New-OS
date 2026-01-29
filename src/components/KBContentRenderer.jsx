import React from 'react';
import { Download } from 'lucide-react';

export default function KBContentRenderer({ content }) {
  const processedContent = content.replace(
    /<a href="([^"]+\.pdf)"[^>]*>([^<]*)<\/a>/gi,
    (match, pdfUrl, linkText) => {
      const fileName = pdfUrl.split('/').pop() || 'document.pdf';
      const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
      
      return `
        <div class="my-6">
          <iframe src="${viewerUrl}" style="width: 100%; height: 600px; border: 1px solid #e2e8f0; border-radius: 0.75rem; display: block;" title="PDF Viewer"></iframe>
          <a href="${pdfUrl}" class="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium text-sm mt-3" style="text-decoration: none; color: white;">📥 Download ${linkText || 'PDF'}</a>
        </div>
        `;
    }
  );

  return (
    <div 
      className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-img:rounded-xl prose-img:shadow-md prose-img:border-0 prose-strong:text-slate-900 prose-code:text-violet-600 prose-code:bg-violet-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:shadow-lg prose-blockquote:border-l-4 prose-blockquote:border-violet-500 prose-blockquote:bg-violet-50 prose-blockquote:py-1"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}