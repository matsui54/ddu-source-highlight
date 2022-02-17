import {
  ActionArguments,
  ActionFlags,
  Actions,
  BaseSource,
  Item,
} from "https://deno.land/x/ddu_vim@v0.12.2/types.ts#^";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v0.12.2/deps.ts#^";

type Params = Record<never, never>;
type ActionData = { command: string };

export class Source extends BaseSource<Params> {
  kind = "highlight";

  gather(args: {
    denops: Denops;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const items: Item<ActionData>[] = [];

        try {
          const lines = (await fn.execute(
            args.denops,
            "highlight",
          ) as string).split("\n");
          lines.map((line) => {
            const m = line.match(/(\S*)\s+xxx\s(.*)$/);
            if (!m || m.length < 3) return;
            const [_, group, args] = m;

            let command = "";
            const mLink = args.match(/links to (.*)$/);
            if (mLink) {
              command = `hi! link ${group} ${mLink[1]}`;
            } else {
              command = `hi! ${group} ${args}`;
            }
            items.push({
              word: line,
              highlights: [{
                name: "ddu-highlight-hl",
                "hl_group": group,
                col: line.indexOf("xxx") + 1,
                width: 3,
              }],
              action: { command: command },
            });
          });
          controller.enqueue(items);
        } catch (e) {
          console.error(e);
        }
        controller.close();
      },
    });
  }

  actions: Actions<Params> = {
    edit: async ({ denops, items }: ActionArguments<Params>) => {
      const action = items[0]?.action as ActionData;
      await fn.feedkeys(denops, `:${action.command}`, "n");
      return Promise.resolve(ActionFlags.None);
    },
  };
  params(): Params {
    return {};
  }
}
