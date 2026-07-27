/* Design tokens, lifted out of the component unchanged so the review
   page can match. Warm plaster, deep olive, serif display, mono for
   prices and labels. */

export const T = {
  paper: "#EFE9DC",
  card: "#FBF8F2",
  ink: "#22261C",
  inkSoft: "#616654",
  inkFaint: "#8B8F7F",
  olive: "#4B5738",
  oliveDeep: "#333D24",
  oliveWash: "#E2E5D2",
  brick: "#8A4B34",
  rule: "#CFC8B6",
};

export const DISPLAY = `'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif`;
export const BODY = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif`;
export const MONO = `ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace`;

export const money = (n) => "£" + Number(n || 0).toLocaleString("en-GB");
