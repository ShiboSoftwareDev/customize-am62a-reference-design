import { expect, test } from "bun:test"
import { boosterPackBoards } from "lib/boosterpack-configurations"
import { createBoosterPackElement } from "../scripts/create-boosterpack-element"

test("maps every removable feature to its upstream TSX exclusion prop", () => {
  const expectedPropsByBoard = {
    boostxl_edumkii: {
      excludeTftDisplay: true,
      excludeControls: true,
      excludeSensorSuite: true,
      excludeMicrophone: true,
      excludeRgbLedAndBuzzer: true,
      excludeServoAndClipExpansion: true,
      excludePowerIndicators: true,
    },
    boost_drv8848: {
      excludeFaultIndicator: true,
      excludeMotorPowerIndicator: true,
    },
    boostxl_bassensors: {
      excludeTemperatureSensor: true,
      excludeHallSensor: true,
      excludeHumiditySensor: true,
      excludeAmbientLightSensor: true,
    },
    boostxl_audio: {
      excludeDacAndPwmSource: true,
      excludeHeadset: true,
      excludeMicrophonePreamplifier: true,
      excludeAudioSwitch: true,
      excludeLoudspeakerAmplifier: true,
    },
    boostxl_cc2650ma: {
      excludeDebugHeader: true,
      excludeExternalFlash: true,
      excludeRoutingOptions: true,
      excludeStatusLeds: true,
      excludeTestPoints: true,
    },
  }

  for (const board of boosterPackBoards) {
    const element = createBoosterPackElement({
      boardId: board.id,
      removedFeatureIds: board.removableFeatures.map(({ id }) => id),
    })
    expect(element).toMatchObject({ props: expectedPropsByBoard[board.id] })
  }
})
