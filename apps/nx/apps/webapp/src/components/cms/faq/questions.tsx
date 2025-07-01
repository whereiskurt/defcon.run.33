'use client';

import { Accordion, AccordionItem, Divider } from '@heroui/react';
import { Heading } from '@components/ui/typography';
import RichBody from '../richBody';

interface FAQProps {
  questions: any;
  className?: string;
}

export default function FAQ({ questions, className = '' }: FAQProps) {

  const itemClasses = {
    base: 'p-0',
    title: 'p-0 text-current',
    subtitle: 'p-0',
    indicator: 'text-2xl',
    content: 'text-xl ',
  };

  const tsxItems = [...questions]
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    .map((item: any) => (
      <AccordionItem
        title={
          <>
            <Heading level={5}>
              {item.sequence}. {item.title}
            </Heading>
          </>
        }
        subtitle={'Updated: ' + item.last_change.substring(0, 10)}
        textValue={`Accordion ${item.id}`}
      >
        <Heading level={5}>Question</Heading>
        <RichBody content={item.question} />
        <Divider className="my-1" />
        <Heading level={5}>Answer</Heading>
        <RichBody content={item.answer} />
      </AccordionItem>
    ));

  return (
    <Accordion
      className={className}
      selectionMode="multiple"
      variant="bordered"
      isCompact
      itemClasses={itemClasses}
    >
      {tsxItems}
    </Accordion>
  );
}
