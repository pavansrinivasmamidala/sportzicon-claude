/** Web: picked files are blob: URLs, which fetch reads directly. */
export async function readBytes(uri: string): Promise<ArrayBuffer> {
  return (await fetch(uri)).arrayBuffer();
}
