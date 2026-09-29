export const boosterPackSourceRepositoryUrl = "https://github.com/tscircuit/boosters"
export const boosterPackSourceCommit = "40ea8f330d7c3b5e5f79d9bfd935daa4173e4d18"

export type BoosterPackId =
  | "boostxl_edumkii"
  | "boost_drv8848"
  | "boostxl_bassensors"
  | "boostxl_audio"
  | "boostxl_cc2650ma"

export type BoosterPackConfigurationId = `${BoosterPackId}_${string}`

export type BoosterPackRemovableFeature = {
  id: string
  label: string
  description: string
  expectedExcludedElementNames: string[]
  expectedExcludedText?: string[]
}

export type BoosterPackConfiguration = {
  id: BoosterPackConfigurationId
  label: string
  description: string
  circuitJsonUrl: string
  removedFeatureIds: string[]
  expectedExcludedElementNames: string[]
  expectedExcludedText: string[]
}

export type BoosterPackBoard = {
  id: BoosterPackId
  slug: string
  name: string
  category: string
  description: string
  sourceUrl: string
  thumbnailUrl: string
  removableFeatures: BoosterPackRemovableFeature[]
  configurations: BoosterPackConfiguration[]
}

type BoosterPackBoardDefinition = Omit<BoosterPackBoard, "configurations" | "sourceUrl">

function createBoard(definition: BoosterPackBoardDefinition): BoosterPackBoard {
  return {
    ...definition,
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/${boosterPackSourceCommit}/${definition.slug}`,
    configurations: createAllConfigurations({
      boardId: definition.id,
      removableFeatures: definition.removableFeatures,
    }),
  }
}

function createAllConfigurations(params: {
  boardId: BoosterPackId
  removableFeatures: BoosterPackRemovableFeature[]
}): BoosterPackConfiguration[] {
  const combinationCount = 1 << params.removableFeatures.length

  return Array.from({ length: combinationCount }, (_, mask) => {
    const removedFeatures = params.removableFeatures.filter((_, index) => mask & (1 << index))
    const isFullBoard = mask === 0
    const isMinimalBoard = mask === combinationCount - 1
    const suffix = isFullBoard
      ? "full"
      : isMinimalBoard
        ? "minimal"
        : `remove_${removedFeatures.map(({ id }) => id).join("_")}`
    const id = `${params.boardId}_${suffix}` as BoosterPackConfigurationId
    const removedLabels = removedFeatures.map(({ label }) => label)

    return {
      id,
      label: isFullBoard
        ? "Full board"
        : isMinimalBoard
          ? "Minimal required board"
          : `Removed: ${removedLabels.join(", ")}`,
      description: isFullBoard
        ? "No optional subsystems removed."
        : isMinimalBoard
          ? "Only the required interface, power path, and board mechanics remain."
          : `${removedLabels.join(", ")} ${removedLabels.length === 1 ? "is" : "are"} removed.`,
      circuitJsonUrl: `/prebuilt-boosterpacks/${id}.circuit.json.gz`,
      removedFeatureIds: removedFeatures.map(({ id }) => id),
      expectedExcludedElementNames: removedFeatures.flatMap(
        ({ expectedExcludedElementNames }) => expectedExcludedElementNames,
      ),
      expectedExcludedText: removedFeatures.flatMap(
        ({ expectedExcludedText }) => expectedExcludedText ?? [],
      ),
    }
  })
}

export const boosterPackBoards: BoosterPackBoard[] = [
  createBoard({
    id: "boostxl_edumkii",
    slug: "boostxl-edumkii",
    name: "BOOSTXL-EDUMKII",
    category: "Education",
    description: "Sensors, controls, display, audio, lighting, and servo expansion.",
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-edumkii/thumbnail.png",
    removableFeatures: [
      {
        id: "display",
        label: "TFT display",
        description: "SPI display module and its support passives.",
        expectedExcludedElementNames: ["DisplaySchematic"],
        expectedExcludedText: ["SPI TFT Display"],
      },
      {
        id: "controls",
        label: "Joystick and buttons",
        description: "Analog joystick and both push buttons.",
        expectedExcludedElementNames: ["ControlsSchematic"],
        expectedExcludedText: ["Joystick & Buttons"],
      },
      {
        id: "sensors",
        label: "Sensor suite",
        description: "Temperature, light, and motion sensors.",
        expectedExcludedElementNames: ["SensorsSchematic"],
        expectedExcludedText: ["Environmental & Motion Sensors"],
      },
      {
        id: "microphone",
        label: "Microphone input",
        description: "Electret microphone and preamplifier front end.",
        expectedExcludedElementNames: ["AudioSchematic"],
        expectedExcludedText: ["Microphone Front End"],
      },
      {
        id: "outputs",
        label: "RGB LED and buzzer",
        description: "Visual and audible output driver blocks.",
        expectedExcludedElementNames: ["OutputsSchematic"],
        expectedExcludedText: ["RGB LED & Buzzer Drivers"],
      },
      {
        id: "expansion",
        label: "Servo and clip expansion",
        description: "Servo header and clip expansion connections.",
        expectedExcludedElementNames: ["ExpansionSchematic"],
        expectedExcludedText: ["Servo & Clip Expansion"],
      },
      {
        id: "power_indicators",
        label: "Power indicators",
        description: "3.3 V and 5 V power LEDs.",
        expectedExcludedElementNames: ["PowerSchematic"],
        expectedExcludedText: ["Power Indicators"],
      },
    ],
  }),
  createBoard({
    id: "boost_drv8848",
    slug: "boost-drv8848",
    name: "BOOST-DRV8848",
    category: "Motor control",
    description: "Dual H-bridge brushed-motor driver with adjustable current regulation.",
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boost-drv8848/thumbnail.png",
    removableFeatures: [
      {
        id: "fault_indicator",
        label: "Fault indicator",
        description: "nFAULT LED and its series resistor.",
        expectedExcludedElementNames: ["D1", "R2"],
      },
      {
        id: "power_indicator",
        label: "Motor-power indicator",
        description: "VM power LED and its series resistor.",
        expectedExcludedElementNames: ["D2", "R6"],
      },
    ],
  }),
  createBoard({
    id: "boostxl_bassensors",
    slug: "boostxl-bassensors",
    name: "BOOSTXL-BASSENSORS",
    category: "Sensors",
    description: "Building-automation temperature, humidity, light, and Hall sensing.",
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-bassensors/thumbnail.png",
    removableFeatures: [
      {
        id: "temperature",
        label: "TMP116 temperature sensor",
        description: "Temperature coupon, connector, and support circuit.",
        expectedExcludedElementNames: ["TMP116_CONNECTOR_BLOCK", "TMP116_SENSOR_COUPON_BLOCK"],
      },
      {
        id: "humidity",
        label: "HDC2010 humidity sensor",
        description: "Humidity sensor and its switched supply.",
        expectedExcludedElementNames: ["HDC2010_BLOCK"],
      },
      {
        id: "hall",
        label: "DRV5055 Hall sensor",
        description: "Hall-effect sensor and its switched supply.",
        expectedExcludedElementNames: ["DRV5055_BLOCK"],
      },
      {
        id: "light",
        label: "OPT3001 ambient-light sensor",
        description: "Ambient-light sensor and support passives.",
        expectedExcludedElementNames: ["OPT3001_BLOCK"],
      },
    ],
  }),
  createBoard({
    id: "boostxl_audio",
    slug: "boostxl-audio",
    name: "BOOSTXL-AUDIO",
    category: "Audio",
    description: "DAC/PWM audio, headset routing, microphone input, and speaker output.",
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-audio/thumbnail.png",
    removableFeatures: [
      {
        id: "dac_source",
        label: "DAC and PWM source",
        description: "DAC, PWM filter, and source-selection network.",
        expectedExcludedElementNames: ["DAC_SIGNAL_SOURCE"],
      },
      {
        id: "headset",
        label: "Headset jack and detection",
        description: "Headset connector and jack-detection circuit.",
        expectedExcludedElementNames: ["AUDIO_JACK_DETECTION"],
      },
      {
        id: "microphone",
        label: "Microphone preamplifier",
        description: "On-board microphone and analog preamplifier.",
        expectedExcludedElementNames: ["MICROPHONE_AMPLIFIER"],
      },
      {
        id: "audio_switch",
        label: "Analog audio switch",
        description: "Analog path-selection and routing switch.",
        expectedExcludedElementNames: ["ANALOG_AUDIO_SWITCH"],
      },
      {
        id: "speaker",
        label: "Loudspeaker amplifier",
        description: "Power amplifier, gain network, and speaker output.",
        expectedExcludedElementNames: ["LOUDSPEAKER_AMPLIFIER"],
      },
    ],
  }),
  createBoard({
    id: "boostxl_cc2650ma",
    slug: "boostxl-cc2650ma",
    name: "BOOSTXL-CC2650MA",
    category: "Wireless",
    description: "Bluetooth Low Energy module with debug, status, and optional flash circuitry.",
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-cc2650ma/thumbnail.png",
    removableFeatures: [
      {
        id: "debug_header",
        label: "JTAG debug header",
        description: "Ten-pin JTAG programming and debug connector.",
        expectedExcludedElementNames: ["P20"],
        expectedExcludedText: ["1.27 mm JTAG Debug Header"],
      },
      {
        id: "external_flash",
        label: "Optional external flash",
        description: "Unpopulated flash footprint and support passives.",
        expectedExcludedElementNames: ["DNM_FLASH_OPTIONS", "C1"],
        expectedExcludedText: ["Optional MX25R8035F Flash (DNM)"],
      },
      {
        id: "routing_options",
        label: "Unpopulated routing options",
        description: "Do-not-mount radio and current-link option resistors.",
        expectedExcludedElementNames: ["DNM_RADIO_OPTIONS", "DNM_CURRENT_LINK"],
      },
      {
        id: "status_leds",
        label: "Status LEDs",
        description: "Green and red radio status indicators.",
        expectedExcludedElementNames: ["R5", "CR1", "R6", "CR2"],
        expectedExcludedText: ["DIO2 Green and DIO4 Red Status LEDs"],
      },
      {
        id: "test_points",
        label: "Reference test points",
        description: "Ground, 3.3 V, and module-supply test points.",
        expectedExcludedElementNames: ["TP1", "TP2", "TP3"],
        expectedExcludedText: ["Reference Test Points (TI MH1-MH3)"],
      },
    ],
  }),
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

export function getConfigurationForRemovedFeatures(params: {
  board: BoosterPackBoard
  removedFeatureIds: string[]
}): BoosterPackConfiguration {
  const removedFeatureIdSet = new Set(params.removedFeatureIds)
  const configuration = params.board.configurations.find(
    ({ removedFeatureIds }) =>
      removedFeatureIds.length === removedFeatureIdSet.size &&
      removedFeatureIds.every((featureId) => removedFeatureIdSet.has(featureId)),
  )
  if (!configuration) throw new Error(`Unknown feature combination for ${params.board.id}`)
  return configuration
}
