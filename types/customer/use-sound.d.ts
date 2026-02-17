declare module 'use-sound' {
    export default function useSound(
        src: string | string[],
        options?: any
    ): [() => void, { stop: () => void; isPlaying: boolean; duration: number | null; sound: any }]
}
