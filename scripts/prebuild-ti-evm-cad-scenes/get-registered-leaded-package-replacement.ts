import type { CadModelReplacement } from "./get-cad-model-replacement"
import { externalStepModelUrls } from "./external-cad-model-urls"

// Package pitch/body dimensions come from the named JEDEC package, rather than
// the footprinter defaults. Numbered pads resolve the Altium library's XY axes.
export function getRegisteredLeadedPackageReplacement(
  normalizedFootprint: string,
): CadModelReplacement | undefined {
  const packages: Array<{
    pattern: RegExp
    modelStepUrl: string
    modelFootprintString: string
  }> = [
    {
      pattern: /^DGN-16X60/u,
      modelStepUrl: externalStepModelUrls.msop8PowerPad,
      modelFootprintString: "msop8_p0.65mm",
    },
    {
      pattern: /^MSOP8_|^VSSOP8_25-59_|^VSSOP8_0D65_/u,
      modelStepUrl: externalStepModelUrls.msop8,
      modelFootprintString: "msop8_p0.65mm",
    },
    {
      pattern: /^TSSOP8_/u,
      modelStepUrl: externalStepModelUrls.tssop8,
      modelFootprintString: "tssop8_p0.65mm_w4.4mm",
    },
    {
      pattern: /^TSSOP14_/u,
      modelStepUrl: externalStepModelUrls.tssop14,
      modelFootprintString: "tssop14_p0.65mm_w4.4mm",
    },
    {
      pattern: /^TSSOP16_/u,
      modelStepUrl: externalStepModelUrls.tssop16,
      modelFootprintString: "tssop16_p0.65mm_w4.4mm",
    },
    {
      pattern: /^TSSOP24_/u,
      modelStepUrl: externalStepModelUrls.tssop24,
      modelFootprintString: "tssop24_p0.65mm_w4.4mm",
    },
    {
      pattern: /^TSSOP56_/u,
      modelStepUrl: externalStepModelUrls.tssop56,
      modelFootprintString: "tssop56_p0.5mm_w6.1mm",
    },
    {
      pattern: /^(?:TSSOP10$|MSOP10_)/u,
      modelStepUrl: externalStepModelUrls.msop10,
      modelFootprintString: "msop10_p0.5mm",
    },
    {
      pattern: /^(?:SC70-5|DCK5_)/u,
      modelStepUrl: externalStepModelUrls.sc70_5,
      modelFootprintString: "sot23-5_p0.65mm_w1.3mm",
    },
    {
      pattern: /^SOT23[-_]5/u,
      modelStepUrl: externalStepModelUrls.sot23_5,
      modelFootprintString: "sot23-5",
    },
    {
      pattern: /^SOT23[-_]6/u,
      modelStepUrl: externalStepModelUrls.sot23_6,
      modelFootprintString: "sot6_p0.95mm",
    },
    {
      pattern: /^(?:TO_SOT23-123|SOT23-123|SOT23$)/u,
      modelStepUrl: externalStepModelUrls.sot23,
      modelFootprintString: "sot23",
    },
  ]
  const matchingPackage = packages.find(({ pattern }) => pattern.test(normalizedFootprint))
  if (matchingPackage) {
    return {
      kind: "step",
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelStepUrl: matchingPackage.modelStepUrl,
      modelFootprintString: matchingPackage.modelFootprintString,
    }
  }

  // TI DGV (TVSOP-14): 3.6 x 4.4 mm body, 0.4 mm pitch, 6.4 mm lead span.
  if (normalizedFootprint.startsWith("TVSOP14_")) {
    const footprinterString =
      "ssop14_p0.4mm_w5.8mm_pl0.8mm_pw0.2mm_bodywidth4.4mm_bodyheight3.6mm_bodythickness1mm"
    return { kind: "footprinter", footprinterString, modelFootprintString: footprinterString }
  }
  const footprinterString = getExistingLeadedFootprint(normalizedFootprint)
  if (footprinterString)
    return { kind: "footprinter", footprinterString, modelFootprintString: footprinterString }
  return undefined
}

function getExistingLeadedFootprint(normalizedFootprint: string): string | undefined {
  if (/^VSSOP8_19-68_/u.test(normalizedFootprint)) return "vssop8_p0.5mm"
  if (/^(?:SOIC8|SO8-)/u.test(normalizedFootprint)) return "soic8_p1.27mm"
  if (/^SOIC16/u.test(normalizedFootprint)) return "soic16_p1.27mm"
  return undefined
}
