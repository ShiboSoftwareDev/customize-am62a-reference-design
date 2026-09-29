import { BatteryCharging_2to5CellNVDCBuckBoost_BQ25731 } from "@tsci/tscircuit.ti/lib/subcircuits/BatteryCharging_2to5CellNVDCBuckBoost_BQ25731.circuit.tsx"
import { BuckConverter_TPS62933 } from "@tsci/tscircuit.ti/lib/subcircuits/BuckConverter_TPS62933.circuit.tsx"
import { ClockBuffer_LMK1C1104 } from "@tsci/tscircuit.ti/lib/subcircuits/ClockBuffer_LMK1C1104.circuit.tsx"
import { DRV8210DSGR } from "@tsci/tscircuit.ti/lib/chips/DRV8210DSGR.circuit.tsx"
import "tscircuit"

export type ParameterizedTiEvmId = "bq25731evm" | "drv8210evm" | "lmk1c1104evm" | "tps62933pevm"

export type ParameterizedTiEvmOptions = {
  connectors: boolean
  controls: boolean
  measurement: boolean
}

const ThreePinPotentiometerFootprint = () => (
  <footprint>
    <platedhole
      portHints={["pin1"]}
      pcbX="-2.54mm"
      pcbY={0}
      outerDiameter="1.6mm"
      holeDiameter="1mm"
    />
    <platedhole portHints={["pin2"]} pcbX={0} pcbY={0} outerDiameter="1.6mm" holeDiameter="1mm" />
    <platedhole
      portHints={["pin3"]}
      pcbX="2.54mm"
      pcbY={0}
      outerDiameter="1.6mm"
      holeDiameter="1mm"
    />
  </footprint>
)

export function ParameterizedTiEvm(props: {
  evmId: ParameterizedTiEvmId
  options: ParameterizedTiEvmOptions
}) {
  if (props.evmId === "bq25731evm") return <Bq25731Evm options={props.options} />
  if (props.evmId === "drv8210evm") return <Drv8210Evm options={props.options} />
  if (props.evmId === "lmk1c1104evm") return <Lmk1c1104Evm options={props.options} />
  return <Tps62933pEvm options={props.options} />
}

function Bq25731Evm({ options }: { options: ParameterizedTiEvmOptions }) {
  return (
    <board width="118mm" height="76mm" autorouter="beta_pipeline9">
      <BatteryCharging_2to5CellNVDCBuckBoost_BQ25731
        name="charger"
        pcbX={0}
        pcbY={0}
        routingDisabled={false}
      />
      {options.connectors && (
        <>
          <pinheader name="J_AC" pinCount={2} pcbX={-51} pcbY={20} schX={-20} schY={8} />
          <pinheader name="J_BAT" pinCount={2} pcbX={51} pcbY={20} schX={20} schY={8} />
          <pinheader name="J_SYS" pinCount={2} pcbX={51} pcbY={-20} schX={20} schY={-8} />
          <trace from=".J_AC > .pin1" to=".charger > net.VBUS" />
          <trace from=".J_AC > .pin2" to=".charger > net.GND" />
          <trace from=".J_BAT > .pin1" to=".charger > net.BAT" />
          <trace from=".J_BAT > .pin2" to=".charger > net.GND" />
          <trace from=".J_SYS > .pin1" to=".charger > net.VSYS" />
          <trace from=".J_SYS > .pin2" to=".charger > net.GND" />
        </>
      )}
      {options.controls && (
        <>
          <pinheader name="J_I2C" pinCount={10} pcbX={-51} pcbY={-12} schX={-20} schY={0} />
          <trace from=".J_I2C > .pin1" to=".charger > .U1 > .SDA" />
          <trace from=".J_I2C > .pin2" to=".charger > .U1 > .SCL" />
          <trace from=".J_I2C > .pin3" to=".charger > net.GND" />
        </>
      )}
      {options.measurement && (
        <>
          <testpoint name="TP_VBUS" pcbX={-38} pcbY={29} schX={-15} schY={5} />
          <testpoint name="TP_BAT" pcbX={38} pcbY={29} schX={15} schY={5} />
          <testpoint name="TP_SYS" pcbX={38} pcbY={-29} schX={15} schY={-5} />
          <testpoint name="TP_GND" pcbX={-38} pcbY={-29} schX={-15} schY={-5} />
          <trace from=".TP_VBUS > .pin1" to=".charger > net.VBUS" />
          <trace from=".TP_BAT > .pin1" to=".charger > net.BAT" />
          <trace from=".TP_SYS > .pin1" to=".charger > net.VSYS" />
          <trace from=".TP_GND > .pin1" to=".charger > net.GND" />
        </>
      )}
      <silkscreentext text="BQ25731EVM" pcbX={0} pcbY={32} fontSize={3} />
    </board>
  )
}

function Drv8210Evm({ options }: { options: ParameterizedTiEvmOptions }) {
  return (
    <board width="85mm" height="55mm" autorouter="beta_pipeline9">
      <Drv8210Core name="motor_driver" pcbX={8} pcbY={0} />
      {options.connectors && (
        <>
          <pinheader name="J_VM" pinCount={2} pcbX={-34} pcbY={18} schX={-12} schY={5} />
          <pinheader name="J_MOTOR" pinCount={2} pcbX={34} pcbY={0} schX={12} schY={0} />
          <trace from=".J_VM > .pin1" to=".motor_driver > net.VM" />
          <trace from=".J_VM > .pin2" to=".motor_driver > net.GND" />
          <trace from=".J_MOTOR > .pin1" to=".motor_driver > .U1 > .OUT1" />
          <trace from=".J_MOTOR > .pin2" to=".motor_driver > .U1 > .OUT2" />
        </>
      )}
      {options.controls && (
        <>
          <pinheader name="J_CONTROL" pinCount={8} pcbX={-34} pcbY={-8} schX={-12} schY={-2} />
          <potentiometer
            name="R_PH"
            maxResistance="10k"
            pinVariant="three_pin"
            footprint={<ThreePinPotentiometerFootprint />}
            pcbX={-8}
            pcbY={16}
            schX={-5}
            schY={5}
          />
          <potentiometer
            name="R_EN"
            maxResistance="10k"
            pinVariant="three_pin"
            footprint={<ThreePinPotentiometerFootprint />}
            pcbX={8}
            pcbY={16}
            schX={5}
            schY={5}
          />
          <trace from=".J_CONTROL > .pin1" to=".motor_driver > net.VCC" />
          <trace from=".J_CONTROL > .pin2" to=".motor_driver > net.GND" />
          <trace from=".J_CONTROL > .pin3" to=".motor_driver > .U1 > .IN1" />
          <trace from=".J_CONTROL > .pin4" to=".motor_driver > .U1 > .IN2" />
          <trace from=".R_PH > .pin1" to=".motor_driver > net.VCC" />
          <trace from=".R_PH > .pin2" to=".motor_driver > .U1 > .IN1" />
          <trace from=".R_PH > .pin3" to=".motor_driver > net.GND" />
          <trace from=".R_EN > .pin1" to=".motor_driver > net.VCC" />
          <trace from=".R_EN > .pin2" to=".motor_driver > .U1 > .IN2" />
          <trace from=".R_EN > .pin3" to=".motor_driver > net.GND" />
        </>
      )}
      {options.measurement && (
        <>
          <testpoint name="TP_VM" pcbX={-24} pcbY={22} schX={-9} schY={7} />
          <testpoint name="TP_OUT1" pcbX={24} pcbY={18} schX={9} schY={5} />
          <testpoint name="TP_OUT2" pcbX={24} pcbY={-18} schX={9} schY={-5} />
          <testpoint name="TP_GND" pcbX={-24} pcbY={-22} schX={-9} schY={-7} />
          <trace from=".TP_VM > .pin1" to=".motor_driver > net.VM" />
          <trace from=".TP_OUT1 > .pin1" to=".motor_driver > .U1 > .OUT1" />
          <trace from=".TP_OUT2 > .pin1" to=".motor_driver > .U1 > .OUT2" />
          <trace from=".TP_GND > .pin1" to=".motor_driver > net.GND" />
        </>
      )}
      <silkscreentext text="DRV8210EVM" pcbX={0} pcbY={23} fontSize={3} />
    </board>
  )
}

function Drv8210Core(props: { name: string; pcbX: number; pcbY: number }) {
  return (
    <subcircuit {...props}>
      <DRV8210DSGR name="U1" pcbX={0} pcbY={0} schX={0} schY={0} />
      <capacitor
        name="C_VM"
        capacitance="0.1uF"
        footprint="0402"
        pcbX={-0.8}
        pcbY={-1.8}
        schX={3}
        schY={1.8}
        schRotation={-90}
      />
      <capacitor
        name="C_VCC"
        capacitance="0.1uF"
        footprint="0402"
        pcbX={-0.8}
        pcbY={1.8}
        schX={-2}
        schY={2.4}
        schRotation={-90}
      />
      <trace from=".U1 > .VM" to=".C_VM > .pin1" maxLength="10mm" />
      <trace from=".C_VM > .pin1" to="net.VM" maxLength="10mm" />
      <trace from=".C_VM > .pin2" to="net.GND" maxLength="10mm" />
      <trace from=".U1 > .VCC" to=".C_VCC > .pin1" maxLength="10mm" />
      <trace from=".C_VCC > .pin1" to="net.VCC" maxLength="10mm" />
      <trace from=".C_VCC > .pin2" to="net.GND" maxLength="10mm" />
      <trace from=".U1 > .MODE" to="net.GND" maxLength="10mm" />
      <trace from=".U1 > .GND" to="net.GND" maxLength="10mm" />
      <trace from=".U1 > .EP" to="net.GND" maxLength="10mm" />
    </subcircuit>
  )
}

function Lmk1c1104Evm({ options }: { options: ParameterizedTiEvmOptions }) {
  return (
    <board width="82mm" height="68mm" autorouter="auto" autorouterVersion="beta_pipeline7">
      <ClockBuffer_LMK1C1104
        name="clock_buffer"
        pcbX={0}
        pcbY={0}
        routingDisabled={false}
        autorouter="auto"
        autorouterVersion="beta_pipeline7"
      />
      {options.connectors && (
        <>
          <pinheader name="J_AUX_POWER" pinCount={2} pcbX={-34} pcbY={26} schX={-18} schY={8} />
          <trace from=".J_AUX_POWER > .pin1" to=".clock_buffer > net.VDD" />
          <trace from=".J_AUX_POWER > .pin2" to=".clock_buffer > net.GND" />
        </>
      )}
      {options.controls && (
        <>
          <pinheader name="J_OUTPUT_ENABLE" pinCount={3} pcbX={-25} pcbY={26} schX={-12} schY={8} />
          <trace from=".J_OUTPUT_ENABLE > .pin1" to=".clock_buffer > net.VDD" />
          <trace from=".J_OUTPUT_ENABLE > .pin2" to=".clock_buffer > net.OE" />
          <trace from=".J_OUTPUT_ENABLE > .pin3" to=".clock_buffer > net.GND" />
        </>
      )}
      {options.measurement && (
        <>
          <testpoint name="TP_VDD" pcbX={25} pcbY={26} schX={12} schY={8} />
          <testpoint name="TP_GND" pcbX={34} pcbY={26} schX={18} schY={8} />
          <trace from=".TP_VDD > .pin1" to=".clock_buffer > net.VDD" />
          <trace from=".TP_GND > .pin1" to=".clock_buffer > net.GND" />
        </>
      )}
    </board>
  )
}

function Tps62933pEvm({ options }: { options: ParameterizedTiEvmOptions }) {
  return (
    <board width="76mm" height="64mm">
      <BuckConverter_TPS62933 name="buck_converter" pcbX={0} pcbY={0} />
      {options.connectors && (
        <>
          <pinheader name="J_INPUT" pinCount={2} pcbX={-31} pcbY={18} schX={-15} schY={5} />
          <pinheader name="J_OUTPUT" pinCount={2} pcbX={31} pcbY={18} schX={15} schY={5} />
          <trace from=".J_INPUT > .pin1" to=".buck_converter > net.VIN" />
          <trace from=".J_INPUT > .pin2" to=".buck_converter > net.GND" />
          <trace from=".J_OUTPUT > .pin1" to=".buck_converter > net.VOUT" />
          <trace from=".J_OUTPUT > .pin2" to=".buck_converter > net.GND" />
        </>
      )}
      {options.controls && (
        <>
          <pinheader name="J_ENABLE" pinCount={3} pcbX={-31} pcbY={0} schX={-15} schY={0} />
          <pinheader name="J_RT" pinCount={2} pcbX={0} pcbY={24} schX={0} schY={8} />
          <trace from=".J_ENABLE > .pin1" to=".buck_converter > net.VIN" />
          <trace from=".J_ENABLE > .pin2" to=".buck_converter > .U1 > .EN" />
          <trace from=".J_ENABLE > .pin3" to=".buck_converter > net.GND" />
          <trace from=".J_RT > .pin1" to=".buck_converter > .U1 > .RT" />
          <trace from=".J_RT > .pin2" to=".buck_converter > net.GND" />
        </>
      )}
      {options.measurement && (
        <>
          <testpoint name="TP_VIN" pcbX={-25} pcbY={26} schX={-10} schY={8} />
          <testpoint name="TP_VOUT" pcbX={25} pcbY={26} schX={10} schY={8} />
          <testpoint name="TP_SW" pcbX={12} pcbY={-24} schX={5} schY={-8} />
          <testpoint name="TP_GND" pcbX={-25} pcbY={-26} schX={-10} schY={-8} />
          <trace from=".TP_VIN > .pin1" to=".buck_converter > net.VIN" />
          <trace from=".TP_VOUT > .pin1" to=".buck_converter > net.VOUT" />
          <trace from=".TP_SW > .pin1" to=".buck_converter > net.SW" />
          <trace from=".TP_GND > .pin1" to=".buck_converter > net.GND" />
        </>
      )}
      <silkscreentext text="TPS62933PEVM" pcbX={0} pcbY={28} fontSize={3} />
    </board>
  )
}
