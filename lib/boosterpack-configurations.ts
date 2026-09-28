export const boosterPackSourceRepositoryUrl = "https://github.com/tscircuit/boosters"
export const boosterPackSourceCommit = "4b8b330cf06cee8109edab00d8bba5973925da76"

export type BoosterPackId =
  | "boostxl_edumkii"
  | "boost_drv8848"
  | "boostxl_bassensors"
  | "boostxl_audio"
  | "boostxl_cc2650ma"

export type BoosterPackConfigurationId = `${BoosterPackId}_${string}`

export type BoosterPackConfiguration = {
  id: BoosterPackConfigurationId
  label: string
  description: string
  circuitJsonUrl: string
  excludedElementNames: string[]
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

function createConfiguration(params: {
  id: BoosterPackConfigurationId
  label: string
  description: string
  excludedElementNames?: string[]
}): BoosterPackConfiguration {
  return {
    ...params,
    circuitJsonUrl: `/prebuilt-boosterpacks/${params.id}.circuit.json.gz`,
    excludedElementNames: params.excludedElementNames ?? [],
  }
}

const educationBlocks = {
  display: ["DisplaySchematic"],
  controls: ["ControlsSchematic"],
  sensors: ["SensorsSchematic"],
  microphone: ["AudioSchematic"],
  outputs: ["OutputsSchematic"],
  expansion: ["ExpansionSchematic"],
  powerIndicators: ["PowerSchematic"],
} as const

type EducationBlock = keyof typeof educationBlocks

function excludeEducationBlocks(includedBlocks: EducationBlock[]): string[] {
  const includedBlockSet = new Set<EducationBlock>(includedBlocks)
  return Object.entries(educationBlocks).flatMap(([block, elementNames]) =>
    includedBlockSet.has(block as EducationBlock) ? [] : elementNames,
  )
}

const educationalConfigurations: BoosterPackConfiguration[] = [
  createConfiguration({
    id: "boostxl_edumkii_full",
    label: "Complete learning kit",
    description: "All display, controls, sensors, audio, lighting, and expansion circuits.",
  }),
  createConfiguration({
    id: "boostxl_edumkii_sensor_lab",
    label: "Sensor lab",
    description: "Environmental and motion sensors with the LaunchPad interface.",
    excludedElementNames: excludeEducationBlocks(["sensors"]),
  }),
  createConfiguration({
    id: "boostxl_edumkii_user_interface",
    label: "User-interface lab",
    description: "TFT display, joystick, and push buttons.",
    excludedElementNames: excludeEducationBlocks(["display", "controls"]),
  }),
  createConfiguration({
    id: "boostxl_edumkii_audio_input",
    label: "Audio-input lab",
    description: "Electret microphone and preamplifier input path.",
    excludedElementNames: excludeEducationBlocks(["microphone"]),
  }),
  createConfiguration({
    id: "boostxl_edumkii_output_lab",
    label: "Output lab",
    description: "RGB LED and buzzer driver outputs.",
    excludedElementNames: excludeEducationBlocks(["outputs"]),
  }),
  createConfiguration({
    id: "boostxl_edumkii_robotics_lab",
    label: "Robotics lab",
    description: "Controls, sensing, RGB/buzzer outputs, and servo expansion.",
    excludedElementNames: excludeEducationBlocks(["controls", "sensors", "outputs", "expansion"]),
  }),
  createConfiguration({
    id: "boostxl_edumkii_servo_controls",
    label: "Servo controls",
    description: "Joystick, buttons, and the servo/clip expansion interface.",
    excludedElementNames: excludeEducationBlocks(["controls", "expansion"]),
  }),
  createConfiguration({
    id: "boostxl_edumkii_minimal_interface",
    label: "Minimal interface",
    description: "LaunchPad headers and board mechanics without optional learning blocks.",
    excludedElementNames: excludeEducationBlocks([]),
  }),
]

const motorDriverConfigurations: BoosterPackConfiguration[] = [
  createConfiguration({
    id: "boost_drv8848_full",
    label: "Dual motor reference",
    description: "Complete TI reference circuit with power and fault indicators.",
  }),
  createConfiguration({
    id: "boost_drv8848_power_indicator",
    label: "Power indicator only",
    description: "Dual motor circuit with the VM power LED and no fault LED.",
    excludedElementNames: ["D1", "R2"],
  }),
  createConfiguration({
    id: "boost_drv8848_fault_indicator",
    label: "Fault indicator only",
    description: "Dual motor circuit with the fault LED and no VM power LED.",
    excludedElementNames: ["D2", "R6"],
  }),
  createConfiguration({
    id: "boost_drv8848_no_indicators",
    label: "No indicators",
    description: "Dual motor circuit without the optional power and fault LEDs.",
    excludedElementNames: ["D1", "D2", "R2", "R6"],
  }),
]

const sensorBlocks = [
  {
    key: "temperature",
    label: "Temperature",
    elementNames: [
      "TMP116_CONNECTOR_BLOCK",
      "TMP116_SENSOR_COUPON_BLOCK",
      "02 - TMP116 Temperature",
    ],
  },
  {
    key: "humidity",
    label: "Humidity",
    elementNames: ["HDC2010_BLOCK", "04 - HDC2010 Humidity"],
  },
  {
    key: "hall",
    label: "Hall effect",
    elementNames: ["DRV5055_BLOCK", "03 - DRV5055 Hall Sensor"],
  },
  {
    key: "light",
    label: "Ambient light",
    elementNames: ["OPT3001_BLOCK", "05 - OPT3001 Ambient Light"],
  },
] as const

function createSensorConfigurations(): BoosterPackConfiguration[] {
  const configurations: BoosterPackConfiguration[] = []
  const allSensorsMask = (1 << sensorBlocks.length) - 1

  for (let mask = allSensorsMask; mask >= 1; mask -= 1) {
    const includedSensors = sensorBlocks.filter((_, index) => mask & (1 << index))
    const excludedSensors = sensorBlocks.filter((_, index) => !(mask & (1 << index)))
    const sensorKey = includedSensors.map(({ key }) => key).join("_")
    const sensorLabels = includedSensors.map(({ label }) => label)
    const isFullSuite = mask === allSensorsMask

    configurations.push(
      createConfiguration({
        id: isFullSuite
          ? "boostxl_bassensors_full"
          : (`boostxl_bassensors_${sensorKey}` as BoosterPackConfigurationId),
        label: isFullSuite ? "Complete sensor suite" : sensorLabels.join(" + "),
        description: isFullSuite
          ? "Temperature, humidity, Hall-effect, and ambient-light sensing."
          : `${sensorLabels.join(", ")} sensing with the BoosterPack interface.`,
        excludedElementNames: excludedSensors.flatMap(({ elementNames }) => [...elementNames]),
      }),
    )
  }

  return configurations
}

const audioConfigurations: BoosterPackConfiguration[] = [
  createConfiguration({
    id: "boostxl_audio_full",
    label: "Full audio path",
    description: "Complete playback, headset, microphone, routing, and speaker circuit.",
  }),
  createConfiguration({
    id: "boostxl_audio_playback",
    label: "Playback outputs",
    description: "DAC, headset routing, and speaker playback without the microphone front end.",
    excludedElementNames: ["MICROPHONE_AMPLIFIER", "Electret Microphone Preamplifier"],
  }),
  createConfiguration({
    id: "boostxl_audio_headset",
    label: "Headset audio",
    description: "Headset playback and microphone input without the loudspeaker amplifier.",
    excludedElementNames: ["LOUDSPEAKER_AMPLIFIER", "Loudspeaker Amplifier and Output"],
  }),
  createConfiguration({
    id: "boostxl_audio_headset_playback",
    label: "Headset playback",
    description: "DAC and headset routing without microphone or loudspeaker circuits.",
    excludedElementNames: [
      "MICROPHONE_AMPLIFIER",
      "Electret Microphone Preamplifier",
      "LOUDSPEAKER_AMPLIFIER",
      "Loudspeaker Amplifier and Output",
    ],
  }),
]

const statusLedElementNames = ["R5", "CR1", "R6", "CR2", "STATUS_LEDS"]
const testPointElementNames = ["TP1", "TP2", "TP3", "TEST_POINTS"]
const flashElementNames = ["DNM_FLASH_OPTIONS", "C1", "OPTIONAL_FLASH"]
const debugAndFlashElementNames = ["DEBUG_AND_FLASH", "debug-flash"]

const wirelessConfigurations: BoosterPackConfiguration[] = [
  createConfiguration({
    id: "boostxl_cc2650ma_full",
    label: "Wireless development",
    description: "Radio, JTAG, optional flash, current measurement, status, and test points.",
  }),
  createConfiguration({
    id: "boostxl_cc2650ma_no_flash",
    label: "Development without flash",
    description: "Radio and JTAG development circuit without the optional external flash.",
    excludedElementNames: flashElementNames,
  }),
  createConfiguration({
    id: "boostxl_cc2650ma_no_status_leds",
    label: "Development without LEDs",
    description: "Complete radio, debug, flash, and measurement circuit without status LEDs.",
    excludedElementNames: statusLedElementNames,
  }),
  createConfiguration({
    id: "boostxl_cc2650ma_debug_lean",
    label: "Lean development",
    description: "Radio and JTAG with no optional flash or status LEDs.",
    excludedElementNames: [...flashElementNames, ...statusLedElementNames],
  }),
  createConfiguration({
    id: "boostxl_cc2650ma_radio_only",
    label: "Radio module",
    description:
      "Radio interface, power measurement, status LEDs, and test points without debug or flash.",
    excludedElementNames: debugAndFlashElementNames,
  }),
  createConfiguration({
    id: "boostxl_cc2650ma_production",
    label: "Production radio",
    description: "Minimal radio and power path without debug, flash, status LEDs, or test points.",
    excludedElementNames: [
      ...debugAndFlashElementNames,
      ...statusLedElementNames,
      ...testPointElementNames,
    ],
  }),
]

export const boosterPackBoards: BoosterPackBoard[] = [
  {
    id: "boostxl_edumkii",
    slug: "boostxl-edumkii",
    name: "BOOSTXL-EDUMKII",
    category: "Education",
    description: "Sensors, controls, display, audio, lighting, and servo expansion.",
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/${boosterPackSourceCommit}/boostxl-edumkii`,
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-edumkii/thumbnail.png",
    configurations: educationalConfigurations,
  },
  {
    id: "boost_drv8848",
    slug: "boost-drv8848",
    name: "BOOST-DRV8848",
    category: "Motor control",
    description: "Dual H-bridge brushed-motor driver with adjustable current regulation.",
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/${boosterPackSourceCommit}/boost-drv8848`,
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boost-drv8848/thumbnail.png",
    configurations: motorDriverConfigurations,
  },
  {
    id: "boostxl_bassensors",
    slug: "boostxl-bassensors",
    name: "BOOSTXL-BASSENSORS",
    category: "Sensors",
    description: "Building-automation temperature, humidity, light, and Hall sensing.",
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/${boosterPackSourceCommit}/boostxl-bassensors`,
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-bassensors/thumbnail.png",
    configurations: createSensorConfigurations(),
  },
  {
    id: "boostxl_audio",
    slug: "boostxl-audio",
    name: "BOOSTXL-AUDIO",
    category: "Audio",
    description: "DAC/PWM audio, headset routing, microphone input, and speaker output.",
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/${boosterPackSourceCommit}/boostxl-audio`,
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-audio/thumbnail.png",
    configurations: audioConfigurations,
  },
  {
    id: "boostxl_cc2650ma",
    slug: "boostxl-cc2650ma",
    name: "BOOSTXL-CC2650MA",
    category: "Wireless",
    description: "Bluetooth Low Energy module with debug, status, and optional flash circuitry.",
    sourceUrl: `${boosterPackSourceRepositoryUrl}/tree/${boosterPackSourceCommit}/boostxl-cc2650ma`,
    thumbnailUrl: "https://boosterpacks.tscircuit.com/boards/boostxl-cc2650ma/thumbnail.png",
    configurations: wirelessConfigurations,
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
