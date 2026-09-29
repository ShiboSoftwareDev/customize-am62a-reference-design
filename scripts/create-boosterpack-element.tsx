import AudioBoosterPack from "@tsci/tscircuit.boosters/boostxl-audio/index.circuit"
import BuildingAutomationSensorsBoosterPack from "@tsci/tscircuit.boosters/boostxl-bassensors/index.circuit"
import WirelessBoosterPack from "@tsci/tscircuit.boosters/boostxl-cc2650ma/index.circuit"
import EducationalBoosterPack from "@tsci/tscircuit.boosters/boostxl-edumkii/index.circuit"
import MotorDriverBoosterPack from "@tsci/tscircuit.boosters/boost-drv8848/index.circuit"
import type { ReactElement } from "react"
import { getBoosterPackBoard, type BoosterPackId } from "../lib/boosterpack-configurations"

export function createBoosterPackElement(params: {
  boardId: BoosterPackId
  removedFeatureIds: readonly string[]
}): ReactElement {
  const removedFeatureIds = new Set(params.removedFeatureIds)
  const board = getBoosterPackBoard(params.boardId)

  for (const removedFeatureId of removedFeatureIds) {
    if (!board.removableFeatures.some(({ id }) => id === removedFeatureId)) {
      throw new Error(`Unknown removable feature ${removedFeatureId} for ${params.boardId}`)
    }
  }

  switch (params.boardId) {
    case "boostxl_edumkii":
      return (
        <EducationalBoosterPack
          excludeTftDisplay={removedFeatureIds.has("display")}
          excludeControls={removedFeatureIds.has("controls")}
          excludeSensorSuite={removedFeatureIds.has("sensors")}
          excludeMicrophone={removedFeatureIds.has("microphone")}
          excludeRgbLedAndBuzzer={removedFeatureIds.has("outputs")}
          excludeServoAndClipExpansion={removedFeatureIds.has("expansion")}
          excludePowerIndicators={removedFeatureIds.has("power_indicators")}
        />
      )
    case "boost_drv8848":
      return (
        <MotorDriverBoosterPack
          excludeFaultIndicator={removedFeatureIds.has("fault_indicator")}
          excludeMotorPowerIndicator={removedFeatureIds.has("power_indicator")}
        />
      )
    case "boostxl_bassensors":
      return (
        <BuildingAutomationSensorsBoosterPack
          excludeTemperatureSensor={removedFeatureIds.has("temperature")}
          excludeHallSensor={removedFeatureIds.has("hall")}
          excludeHumiditySensor={removedFeatureIds.has("humidity")}
          excludeAmbientLightSensor={removedFeatureIds.has("light")}
        />
      )
    case "boostxl_audio":
      return (
        <AudioBoosterPack
          excludeDacAndPwmSource={removedFeatureIds.has("dac_source")}
          excludeHeadset={removedFeatureIds.has("headset")}
          excludeMicrophonePreamplifier={removedFeatureIds.has("microphone")}
          excludeAudioSwitch={removedFeatureIds.has("audio_switch")}
          excludeLoudspeakerAmplifier={removedFeatureIds.has("speaker")}
        />
      )
    case "boostxl_cc2650ma":
      return (
        <WirelessBoosterPack
          excludeDebugHeader={removedFeatureIds.has("debug_header")}
          excludeExternalFlash={removedFeatureIds.has("external_flash")}
          excludeRoutingOptions={removedFeatureIds.has("routing_options")}
          excludeStatusLeds={removedFeatureIds.has("status_leds")}
          excludeTestPoints={removedFeatureIds.has("test_points")}
        />
      )
  }
}
