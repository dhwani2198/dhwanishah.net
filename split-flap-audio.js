// The exported Framer split-flap component synthesizes a Web Audio click.
// Prevent its master gain from reaching the speakers; the site shell supplies
// the ferry MP3 samples instead.
(() => {
    const NativeAudioContext = window.AudioContext || window.webkitAudioContext
    if (!NativeAudioContext || NativeAudioContext.legacyFlapMuted) return

    function SilentLegacyAudioContext(...args) {
        const context = new NativeAudioContext(...args)
        const nativeCreateGain = context.createGain.bind(context)
        context.createGain = () => {
            const gain = nativeCreateGain()
            const nativeConnect = gain.connect.bind(gain)
            gain.connect = (destination, ...connectArgs) => {
                if (destination === context.destination) return destination
                return nativeConnect(destination, ...connectArgs)
            }
            return gain
        }
        return context
    }

    SilentLegacyAudioContext.prototype = NativeAudioContext.prototype
    Object.setPrototypeOf(SilentLegacyAudioContext, NativeAudioContext)
    SilentLegacyAudioContext.legacyFlapMuted = true
    window.AudioContext = SilentLegacyAudioContext
    if (window.webkitAudioContext) window.webkitAudioContext = SilentLegacyAudioContext
})()
