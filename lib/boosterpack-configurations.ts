export const boosterPackSourceRepositoryUrl = "https://github.com/tscircuit/boosters"
export const boosterPackSourceCommit = "4b8b330cf06cee8109edab00d8bba5973925da76"

export type BoosterPackId =
  | "boostxl_edumkii"
  | "boost_drv8848"
  | "boostxl_bassensors"
  | "boostxl_audio"
  | "boostxl_cc2650ma"

export type BoosterPackConfigurationId =
  | "boostxl_edumkii_full"
  | "boostxl_edumkii_sensor_lab"
  | "boost_drv8848_full"
  | "boost_drv8848_no_indicators"
  | "boostxl_bassensors_full"
  | "boostxl_bassensors_environmental"
  | "boostxl_audio_full"
  | "boostxl_audio_playback"
  | "boostxl_cc2650ma_full"
  | "boostxl_cc2650ma_radio_only"

export type BoosterPackConfiguration = {
  id: BoosterPackConfigurationId
  label: string
  description: string
  circuitJsonUrl: string
}

export type BoosterPackBoard = {
  id: BoosterPackId
  slug: string
  name: string
  category: string
  description: string
  sourceUrl: string
  thumbnailUrl: string
  configurations: BoosterPackConfiguration[]
}

function createCircuitJsonUrl(configurationId: BoosterPackConfigurationId): string {
  return `/prebuilt-boosterpacks/${configurationId}.circuit.json.gz`
}

export const boosterPackBoards: BoosterPackBoard[] = [
  {
    id: "boostxl_edumkii",
    slug: "boostxl-edumkii",
    name: "BOOSTXL-EDUMKII",
    category: "Education",
    description: "Sensors, controls, display, audio, lighting, and servo expansion.",
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/${boosterPackSourceCommit}/boostxl-edumkii`,
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-edumkii/thumbnail.png",
    configurations: [
      {
        id: "boostxl_edumkii_full",
        label: "Complete learning kit",
        description: "All display, controls, sensors, audio, lighting, and expansion circuits.",
        circuitJsonUrl: createCircuitJsonUrl("boostxl_edumkii_full"),
      },
      {
        id: "boostxl_edumkii_sensor_lab",
        label: "Sensor lab",
        description: "LaunchPad interface plus environmental and motion sensors.",
        circuitJsonUrl: createCircuitJsonUrl("boostxl_edumkii_sensor_lab"),
      },
    ],
  },
  {
    id: "boost_drv8848",
    slug: "boost-drv8848",
    name: "BOOST-DRV8848",
    category: "Motor control",
    description: "Dual H-bridge brushed-motor driver with adjustable current regulation.",
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/${boosterPackSourceCommit}/boost-drv8848`,
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boost-drv8848/thumbnail.png",
    configurations: [
      {
        id: "boost_drv8848_full",
        label: "Dual motor reference",
        description: "Complete TI reference circuit with power and fault indicators.",
        circuitJsonUrl: createCircuitJsonUrl("boost_drv8848_full"),
      },
      {
        id: "boost_drv8848_no_indicators",
        label: "No indicators",
        description: "Dual motor circuit without the optional power and fault LEDs.",
        circuitJsonUrl: createCircuitJsonUrl("boost_drv8848_no_indicators"),
      },
    ],
  },
  {
    id: "boostxl_bassensors",
    slug: "boostxl-bassensors",
    name: "BOOSTXL-BASSENSORS",
    category: "Sensors",
    description: "Building-automation temperature, humidity, light, and Hall sensing.",
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/${boosterPackSourceCommit}/boostxl-bassensors`,
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-bassensors/thumbnail.png",
    configurations: [
      {
        id: "boostxl_bassensors_full",
        label: "Complete sensor suite",
        description: "Temperature, humidity, ambient-light, and Hall-effect sensing.",
        circuitJsonUrl: createCircuitJsonUrl("boostxl_bassensors_full"),
      },
      {
        id: "boostxl_bassensors_environmental",
        label: "Environmental sensing",
        description:
          "Temperature and humidity sensing without Hall-effect or ambient-light blocks.",
        circuitJsonUrl: createCircuitJsonUrl("boostxl_bassensors_environmental"),
      },
    ],
  },
  {
    id: "boostxl_audio",
    slug: "boostxl-audio",
    name: "BOOSTXL-AUDIO",
    category: "Audio",
    description: "DAC/PWM audio, headset routing, microphone input, and speaker output.",
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/${boosterPackSourceCommit}/boostxl-audio`,
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-audio/thumbnail.png",
    configurations: [
      {
        id: "boostxl_audio_full",
        label: "Full audio path",
        description: "Complete playback, headset, microphone, routing, and speaker circuit.",
        circuitJsonUrl: createCircuitJsonUrl("boostxl_audio_full"),
      },
      {
        id: "boostxl_audio_playback",
        label: "Playback only",
        description:
          "DAC, routing, headset, and speaker playback without the microphone front end.",
        circuitJsonUrl: createCircuitJsonUrl("boostxl_audio_playback"),
      },
    ],
  },
  {
    id: "boostxl_cc2650ma",
    slug: "boostxl-cc2650ma",
    name: "BOOSTXL-CC2650MA",
    category: "Wireless",
    description: "Bluetooth Low Energy module with debug, status, and optional flash circuitry.",
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/${boosterPackSourceCommit}/boostxl-cc2650ma`,
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-cc2650ma/thumbnail.png",
    configurations: [
      {
        id: "boostxl_cc2650ma_full",
        label: "Wireless development",
        description: "Radio, JTAG, optional flash, power measurement, and status circuitry.",
        circuitJsonUrl: createCircuitJsonUrl("boostxl_cc2650ma_full"),
      },
      {
        id: "boostxl_cc2650ma_radio_only",
        label: "Radio module",
        description: "LaunchPad radio interface and power/status circuitry without debug or flash.",
        circuitJsonUrl: createCircuitJsonUrl("boostxl_cc2650ma_radio_only"),
      },
    ],
  },
]

export function getBoosterPackBoard(boardId: BoosterPackId): BoosterPackBoard {
  const board = boosterPackBoards.find(({ id }) => id === boardId)
  if (!board) throw new Error(`Unknown BoosterPack board: ${boardId}`)
  return board
}

export function getBoosterPackConfiguration(
  configurationId: BoosterPackConfigurationId,
): BoosterPackConfiguration {
  for (const board of boosterPackBoards) {
    const configuration = board.configurations.find(({ id }) => id === configurationId)
    if (configuration) return configuration
  }
  throw new Error(`Unknown BoosterPack configuration: ${configurationId}`)
}
