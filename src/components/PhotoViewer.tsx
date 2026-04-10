import avatarWebp from '../assets/avatar.webp'

export function PhotoViewer() {
  return (
    <>
      <div className="window-body photo-viewer">
        <img
          src={avatarWebp}
          alt="Sergei Parfenov"
          className="photo-viewer__image"
        />
      </div>
      <div className="status-bar">
        <p className="status-bar-field">photo.jpg — Sergei Parfenov</p>
        <p className="status-bar-field">300 × 300</p>
      </div>
    </>
  )
}
