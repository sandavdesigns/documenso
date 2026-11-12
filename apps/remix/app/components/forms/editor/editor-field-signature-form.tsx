import { DEFAULT_SIGNATURE_TEXT_FONT_SIZE } from '@documenso/lib/constants/pdf';
import {
  FIELD_SIGNATURE_META_DEFAULT_VALUES,
  type TSignatureFieldMeta,
  ZSignatureFieldMeta,
} from '@documenso/lib/types/field-meta';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@documenso/ui/primitives/form/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trans } from '@lingui/react/macro';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { EditorGenericFontSizeField } from './editor-field-generic-field-forms';

const ZSignatureFieldFormSchema = ZSignatureFieldMeta.pick({
  fontSize: true,
  overflow: true,
  signatureVariant: true,
});

type TSignatureFieldFormSchema = z.infer<typeof ZSignatureFieldFormSchema>;

type EditorFieldSignatureFormProps = {
  value: z.input<typeof ZSignatureFieldMeta> | undefined;
  onValueChange: (value: TSignatureFieldMeta) => void;
};

export const EditorFieldSignatureForm = ({
  value = {
    type: 'signature',
  },
  onValueChange,
}: EditorFieldSignatureFormProps) => {
  const form = useForm<TSignatureFieldFormSchema>({
    resolver: zodResolver(ZSignatureFieldFormSchema),
    mode: 'onChange',
    defaultValues: {
      overflow: value.overflow || FIELD_SIGNATURE_META_DEFAULT_VALUES.overflow,
      fontSize: value.fontSize || DEFAULT_SIGNATURE_TEXT_FONT_SIZE,
      signatureVariant: value.signatureVariant || FIELD_SIGNATURE_META_DEFAULT_VALUES.signatureVariant,
    },
  });

  const { control } = form;

  const formValues = useWatch({
    control,
  });

  // Dupecode/Inefficient: Done because native isValid won't work for our usecase.
  useEffect(() => {
    const validatedFormValues = ZSignatureFieldFormSchema.safeParse(formValues);

    if (validatedFormValues.success) {
      onValueChange({
        type: 'signature',
        ...validatedFormValues.data,
      });
    }
  }, [formValues]);

  return (
    <Form {...form}>
      <form>
        <fieldset className="flex flex-col gap-2">
          <div>
            <EditorGenericFontSizeField formControl={form.control} />
            <p className="mt-0.5 text-muted-foreground text-xs">
              <Trans>The typed signature font size</Trans>
            </p>
          </div>

          <FormField
            control={form.control}
            name="signatureVariant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Trans>Vertretungszusatz</Trans>
                </FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="field-form-signature-variant" className="w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="standard">
                        <Trans>Ohne Zusatz</Trans>
                      </SelectItem>
                      <SelectItem value="ia">i. A.</SelectItem>
                      <SelectItem value="iv">i. V.</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>
      </form>
    </Form>
  );
};
