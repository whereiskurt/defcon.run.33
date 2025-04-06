'use client';

import { Card, CardHeader, CardBody, Divider } from '@heroui/react';
import Text from '@/src/components/ui/Text';
import {
  Paragraph,
  Lead,
  Large,
  Small,
  Muted,
  Heading,
  BlockQuote,
} from '@/src/components/ui/typography';
import { fontAtkinson, fontMuseo } from '@/config/fonts';

export default function TypographyDemo() {
  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="mb-10">
        <CardHeader>
          <Heading level={1}>Typography System</Heading>
          <Lead>
            A showcase of all typography components with Atkinson font for body text
            and Museo font for headings.
          </Lead>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-8">
          <section>
            <Heading level={2}>The Text Component</Heading>
            <Paragraph className="mt-2 mb-4">
              The Text component is the most flexible way to apply Atkinson font. It supports different variants:
            </Paragraph>
            
            <div className="grid gap-4">
              <Card>
                <CardBody>
                  <Text>Default Text component with Atkinson font</Text>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Text variant="small">Small variant text</Text>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Text variant="subheading">Subheading variant text</Text>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Text variant="heading">Heading variant (with Museo override)</Text>
                </CardBody>
              </Card>
            </div>
          </section>

          <section>
            <Heading level={2}>Typography Components</Heading>
            <Paragraph className="mt-2 mb-4">
              A set of specialized typography components pre-configured with appropriate styling:
            </Paragraph>

            <div className="grid gap-4">
              <Card>
                <CardBody>
                  <Heading level={1}>Heading Level 1</Heading>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Heading level={2}>Heading Level 2</Heading>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Heading level={3}>Heading Level 3</Heading>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Paragraph>This is a regular paragraph using Atkinson font for better readability. The Atkinson Hyperlegible font was specifically designed to increase legibility for readers with low vision.</Paragraph>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Lead>This is a Lead paragraph with larger text for introductions and key points.</Lead>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Large>Large text component for emphasis</Large>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Small>Small text component for less important information</Small>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Muted>Muted text component for secondary information</Muted>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <BlockQuote>
                    This is a blockquote with the Atkinson font, perfect for 
                    quoting external sources or highlighting important statements.
                  </BlockQuote>
                </CardBody>
              </Card>
            </div>
          </section>

          <section>
            <Heading level={2}>Font Usage Guidelines</Heading>
            <Paragraph className="mt-2">
              Follow these guidelines for consistent typography across the application:
            </Paragraph>
            
            <ul className={`${fontAtkinson.className} list-disc pl-6 space-y-2 mt-4`}>
              <li>Use <strong>Atkinson Hyperlegible</strong> for all body text, paragraphs, and general content</li>
              <li>Use <strong>Museo Moderno</strong> for headings, titles, and navigation elements</li>
              <li>Use the predefined components whenever possible rather than applying the font classes manually</li>
              <li>For custom cases, use the utility classes from the font exports</li>
            </ul>
          </section>
        </CardBody>
      </Card>
    </div>
  );
}