// Bound screen cost while preserving crisp hull edges on high-density displays.
function RRRenderPixelRatio(width,height,dpr,coarse) {
  const budget=coarse?2200000:3600000;
  return Math.max(.75,Math.min(dpr||1,coarse?1.6:2,Math.sqrt(budget/Math.max(1,width*height))));
}

