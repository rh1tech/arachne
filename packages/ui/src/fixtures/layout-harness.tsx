import { clearDelegatedEvents, delegateEvents, render } from "@arachne/render";
import {
	Column,
	Columns,
	Container,
	Control,
	FormArea,
	FormField,
	FormSection,
	Grid,
	GridItem,
	Help,
	Level,
	LevelItem,
	LevelLeft,
	LevelRight,
	TextInput,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "input"]);

	render(
		() => (
			<Container>
				<Level>
					<LevelLeft>
						<LevelItem>Left</LevelItem>
					</LevelLeft>
					<LevelRight>
						<LevelItem>Right</LevelItem>
					</LevelRight>
				</Level>
				<Columns>
					<Column size={6}>A</Column>
					<Column size={6}>B</Column>
				</Columns>
				<Grid cols={12}>
					<GridItem span={4}>1</GridItem>
					<GridItem span={8}>2</GridItem>
				</Grid>
				<FormSection title="Account" description="Basics">
					<FormField label="Email" labelFor="email" help="Work address" horizontal>
						<Control expanded>
							<TextInput id="email" value="" onInput={() => {}} />
						</Control>
					</FormField>
					<FormArea title="Extras" description="Optional">
						<Help>Nested area</Help>
					</FormArea>
				</FormSection>
			</Container>
		),
		root,
	);

	return {
		get: (sel: string) => root.querySelector(sel),
		all: (sel: string) => root.querySelectorAll(sel),
	};
}
