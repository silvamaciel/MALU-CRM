import React from 'react';


export default function FileIcon({ mimetype }) {
if (typeof mimetype === 'string') {
if (mimetype.startsWith('image/')) return <i className="fas fa-file-image file-icon"></i>;
if (mimetype === 'application/pdf') return <i className="fas fa-file-pdf file-icon"></i>;
if (mimetype.startsWith('audio/')) return <i className="fas fa-file-audio file-icon"></i>;
if (mimetype.startsWith('video/')) return <i className="fas fa-file-video file-icon"></i>;
}
return <i className="fas fa-file-alt file-icon"></i>;
}