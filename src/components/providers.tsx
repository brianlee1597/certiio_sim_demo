"use client";
import { MantineProvider, createTheme } from "@mantine/core";
const theme = createTheme({
  fontFamily: "Instrument Sans Variable, Arial, sans-serif",
  primaryColor: "green",
  defaultRadius: "md",
  colors: {
    green: [
      "#f0f9e9",
      "#deefcf",
      "#bedda5",
      "#9dca7a",
      "#7fbb55",
      "#66ae39",
      "#4e9e28",
      "#408821",
      "#34731b",
      "#265c14",
    ],
  },
  headings: { fontFamily: "Instrument Sans Variable, Arial, sans-serif" },
});
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} forceColorScheme="light">
      {children}
    </MantineProvider>
  );
}
