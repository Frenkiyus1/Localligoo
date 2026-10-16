export async function toWav(blob) {
  if (blob.size > 15_000_000) throw new Error("File quá lớn. Hãy chọn bản ghi dưới 15 MB và 60 giây.");
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) throw new Error("Trình duyệt chưa hỗ trợ xử lý âm thanh. Hãy dùng Chrome, Edge hoặc Safari mới.");
  const context = new Context();
  let decoded;
  try { decoded = await context.decodeAudioData(await blob.arrayBuffer()); }
  catch { throw new Error("Không đọc được file âm thanh. Hãy thử WAV, MP3 hoặc ghi âm trực tiếp."); }
  finally { await context.close(); }
  if (decoded.duration < 1 || decoded.duration > 60.1) throw new Error("Bản ghi cần dài từ 1 đến 60 giây.");
  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.min(rate * 60, Math.ceil(decoded.duration * rate)), rate);
  const source = offline.createBufferSource();
  source.buffer = decoded; source.connect(offline.destination); source.start();
  const samples = (await offline.startRendering()).getChannelData(0);
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  if (Math.sqrt(energy / samples.length) < 0.001) throw new Error("Bản ghi quá nhỏ hoặc không có tiếng. Hãy kiểm tra micro và ghi lại.");
  return encodeWav(samples, rate);
}
export function encodeWav(samples, rate = 16000) {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const text = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) { const value = Math.max(-1, Math.min(1, samples[i])); view.setInt16(44 + i * 2, value < 0 ? value * 32768 : value * 32767, true); }
  return new Blob([bytes], { type: "audio/wav" });
}
export async function base64Audio(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
