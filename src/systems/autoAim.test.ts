import { describe, expect, it } from "vitest";
import { AUTO_AIM_CONE_HALF_ANGLE_DEG, selectAutoAimTarget } from "./autoAim";

describe("selectAutoAimTarget", () => {
  it("returns null when there are no candidates", () => {
    expect(selectAutoAimTarget([], 0, 0, 1, 0)).toBeNull();
  });

  it("picks the nearest candidate inside the facing cone over a closer one outside it", () => {
    const inCone = { id: "in-cone", x: 100, y: 0 }; // straight ahead of facing (1, 0)
    const closerButBehind = { id: "behind", x: -10, y: 0 }; // directly behind, much closer
    const result = selectAutoAimTarget([closerButBehind, inCone], 0, 0, 1, 0);
    expect(result?.id).toBe("in-cone");
  });

  it("picks the nearest of several candidates within the cone", () => {
    const far = { id: "far", x: 200, y: 0 };
    const near = { id: "near", x: 50, y: 10 };
    const result = selectAutoAimTarget([far, near], 0, 0, 1, 0);
    expect(result?.id).toBe("near");
  });

  it("catches an enemy beside/slightly behind during a strafe, per the wide-cone design decision", () => {
    // Facing straight up (dodging), an enemy 100deg off-facing should still be well within
    // a ~165deg-wide cone (82.5deg half-angle) -- this is the exact "dodge and cast back" case
    // the design doc calls out.
    const besideAndBehind = { id: "beside", x: 90, y: -20 };
    const result = selectAutoAimTarget([besideAndBehind], 0, 0, 0, -1);
    expect(result?.id).toBe("beside");
  });

  it("falls back to the globally nearest candidate when nothing is within the cone", () => {
    const behind = { id: "behind-near", x: -20, y: 0 };
    const alsoBehindButFarther = { id: "behind-far", x: -80, y: 0 };
    const result = selectAutoAimTarget([alsoBehindButFarther, behind], 0, 0, 1, 0);
    expect(result?.id).toBe("behind-near");
  });

  it("treats the cone boundary as inclusive at exactly the configured half-angle", () => {
    const angleRad = (AUTO_AIM_CONE_HALF_ANGLE_DEG * Math.PI) / 180;
    const onBoundary = { id: "boundary", x: Math.cos(angleRad) * 100, y: Math.sin(angleRad) * 100 };
    const result = selectAutoAimTarget([onBoundary], 0, 0, 1, 0);
    expect(result?.id).toBe("boundary");
  });

  it("defaults facing to +x when given a zero facing vector, instead of throwing", () => {
    const ahead = { id: "ahead", x: 50, y: 0 };
    expect(() => selectAutoAimTarget([ahead], 0, 0, 0, 0)).not.toThrow();
    expect(selectAutoAimTarget([ahead], 0, 0, 0, 0)?.id).toBe("ahead");
  });
});
