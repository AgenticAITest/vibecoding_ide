import './ImageViewer.css';

interface ImageViewerProps {
  filePath: string;
}

export function ImageViewer({ filePath }: ImageViewerProps) {
  const src = `/api/files/raw?path=${encodeURIComponent(filePath)}`;

  return (
    <div className="image-viewer">
      <img className="image-viewer__img" src={src} alt={filePath} />
      <span className="image-viewer__info">{filePath}</span>
    </div>
  );
}
