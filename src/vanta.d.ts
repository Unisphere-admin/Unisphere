declare module 'vanta/dist/vanta.rings.min' {
  const RINGS: (opts: Record<string, any>) => { destroy: () => void };
  export default RINGS;
}

declare module 'vanta/dist/vanta.waves.min' {
  const WAVES: (opts: Record<string, any>) => { destroy: () => void };
  export default WAVES;
}

declare module 'vanta/dist/vanta.topology.min' {
  const TOPOLOGY: (opts: Record<string, any>) => { destroy: () => void };
  export default TOPOLOGY;
}
