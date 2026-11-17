const COLORS = ['#ffd6a5', '#caffbf', '#9bf6ff', '#bdb2ff', '#ffc6ff', '#fdffb6', '#ffadad', '#a0c4ff'];

// Simple friendly avatar: an emoji for the child on a soft colour.
export const avatarEmoji = (gender) => (gender === 'girl' ? '👧' : gender === 'boy' ? '👦' : '🧒');

export default function Avatar({ profile, size = 56 }) {
  const n = [...(profile?.id || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.58, background: COLORS[n % COLORS.length] }}
      aria-hidden="true"
    >
      {avatarEmoji(profile?.gender)}
    </span>
  );
}
