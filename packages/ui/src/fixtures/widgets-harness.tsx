import { clearDelegatedEvents, delegateEvents, render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import {
	ActionIcon,
	Avatar,
	Card,
	CardContent,
	CardFooter,
	CardFooterItem,
	CardHeader,
	CardHeaderTitle,
	CloseButton,
	Footer,
	Group,
	Hero,
	HeroBody,
	Icon,
	IconBadge,
	Indicator,
	ListGroup,
	ListGroupItem,
	Media,
	MediaContent,
	MediaLeft,
	Message,
	MessageBody,
	MessageHeader,
	NavLink,
	Panel,
	PanelBlock,
	PanelHeading,
	RingProgress,
	Spoiler,
	Text,
	Tile,
	Timeline,
	TimelineItem,
	Title,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click"]);

	const closed = signal(false);

	render(
		() => (
			<div class="widgets-harness">
				<Card>
					<CardHeader>
						<CardHeaderTitle>Card</CardHeaderTitle>
						<CloseButton />
					</CardHeader>
					<CardContent>
						<Text>Body</Text>
					</CardContent>
					<CardFooter>
						<CardFooterItem>Save</CardFooterItem>
						<CardFooterItem>Cancel</CardFooterItem>
					</CardFooter>
				</Card>

				<Panel>
					<PanelHeading>Repos</PanelHeading>
					<PanelBlock active>All</PanelBlock>
					<PanelBlock>Open</PanelBlock>
				</Panel>

				<Tile ancestor>
					<Tile parent size={6}>
						<Tile child>
							<Text>Tile A</Text>
						</Tile>
					</Tile>
					<Tile parent size={6}>
						<Tile child>
							<Text>Tile B</Text>
						</Tile>
					</Tile>
				</Tile>

				<Hero size="sm" tone="light">
					<HeroBody>
						<Title order={2}>Hero</Title>
					</HeroBody>
				</Hero>

				<Footer>Footer line</Footer>

				<Media>
					<MediaLeft>
						<Avatar name="Ada" />
					</MediaLeft>
					<MediaContent>
						<Text>Media object</Text>
					</MediaContent>
				</Media>

				{closed() ? null : (
					<Message tone="info">
						<MessageHeader onClose={() => closed.set(true)}>Info</MessageHeader>
						<MessageBody>Hello message</MessageBody>
					</Message>
				)}

				<Group>
					<Icon name="check" />
					<IconBadge name="star" tone="warning" />
					<ActionIcon label="More">
						<Icon name="more" />
					</ActionIcon>
					<Indicator label={3}>
						<Icon name="bell" />
					</Indicator>
				</Group>

				<ListGroup>
					<ListGroupItem active>One</ListGroupItem>
					<ListGroupItem>Two</ListGroupItem>
				</ListGroup>

				<Timeline>
					<TimelineItem title="Created" bullet="check" active>
						Just now
					</TimelineItem>
					<TimelineItem title="Shipped" bullet="upload">
						Later
					</TimelineItem>
				</Timeline>

				<NavLink label="Overview" description="Home" leftSection={<Icon name="home" />} active />

				<RingProgress value={72} label="72%" />

				<Spoiler maxHeight={40}>
					<Text>
						Long spoiler text that should clip until expanded by the toggle control below the
						content block for testing.
					</Text>
				</Spoiler>
			</div>
		),
		root,
	);

	return {
		get: (sel: string) => root.querySelector(sel),
		all: (sel: string) => root.querySelectorAll(sel),
		click: (sel: string) => {
			(root.querySelector(sel) as HTMLElement | null)?.click();
		},
	};
}
