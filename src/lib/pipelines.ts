import "server-only";
import { getSettings } from "@/lib/settings";
import { stageStyle, type StageView } from "@/lib/stageMeta";
import { normalizeStage, type LeadType } from "@/lib/leads";

export async function getPipeline(type: LeadType): Promise<StageView[]> {
  const settings = await getSettings();
  const stages = settings.pipelines[type].stages;

  let activeSeen = -1;
  return stages.map((s) => {
    const activeIndex = s.group === "active" ? ++activeSeen : -1;
    return { id: s.id, label: s.label, group: s.group, terminal: s.terminal, ...stageStyle(s.group, activeIndex) };
  });
}

export async function getPipelineLabel(type: LeadType): Promise<string> {
  return (await getSettings()).pipelines[type].label;
}

export async function isValidStage(type: LeadType, stage: string): Promise<boolean> {
  return (await getPipeline(type)).some((s) => s.id === stage);
}

export async function terminalStages(type: LeadType): Promise<Set<string>> {
  return new Set((await getPipeline(type)).filter((s) => s.terminal).map((s) => s.id));
}

export async function allTerminalStages(): Promise<Set<string>> {
  const settings = await getSettings();
  const ids = Object.values(settings.pipelines).flatMap((p) => p.stages.filter((s) => s.terminal).map((s) => s.id));
  return new Set(ids);
}

export async function stageLabelFor(type: LeadType, stage: string): Promise<string> {
  const found = (await getPipeline(type)).find((s) => s.id === normalizeStage(stage));
  return found?.label ?? stage.charAt(0).toUpperCase() + stage.slice(1);
}
