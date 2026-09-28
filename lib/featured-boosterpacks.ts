export const boosterPackCatalogUrl = "https://boosterpacks.tscircuit.com/"
export const boosterPackSourceRepositoryUrl = "https://github.com/tscircuit/boosters"

export type FeaturedBoosterPack = {
  slug: string
  name: string
  category: string
  description: string
  detailUrl: string
  thumbnailUrl: string
  sourceUrl: string
}

function createFeaturedBoosterPack(
  boosterPack: Omit<FeaturedBoosterPack, "detailUrl" | "thumbnailUrl" | "sourceUrl">,
): FeaturedBoosterPack {
  return {
    ...boosterPack,
    detailUrl: `${boosterPackCatalogUrl}boards/${boosterPack.slug}/`,
    thumbnailUrl: `${boosterPackCatalogUrl}boards/${boosterPack.slug}/thumbnail.png`,
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/main/${boosterPack.slug}`,
  }
}

export const featuredBoosterPacks: FeaturedBoosterPack[] = [
  createFeaturedBoosterPack({
    slug: "boostxl-edumkii",
    name: "BOOSTXL-EDUMKII",
    category: "Education",
    description: "Display, environmental and motion sensors, joystick, audio, and RGB output.",
  }),
  createFeaturedBoosterPack({
    slug: "boost-drv8848",
    name: "BOOST-DRV8848",
    category: "Motor control",
    description: "Dual H-bridge brushed-motor stage with adjustable current regulation.",
  }),
  createFeaturedBoosterPack({
    slug: "boostxl-bassensors",
    name: "BOOSTXL-BASSENSORS",
    category: "Sensors",
    description: "Temperature, humidity, ambient-light, and Hall-effect sensing.",
  }),
  createFeaturedBoosterPack({
    slug: "boostxl-audio",
    name: "BOOSTXL-AUDIO",
    category: "Audio",
    description: "DAC/PWM audio, headset routing, microphone input, and speaker amplification.",
  }),
  createFeaturedBoosterPack({
    slug: "boostxl-cc2650ma",
    name: "BOOSTXL-CC2650MA",
    category: "Wireless",
    description: "Bluetooth Low Energy module with JTAG, status LEDs, and optional flash.",
  }),
]
