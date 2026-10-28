/**
 * PersonDetailModal Component
 *
 * Reusable modal component for displaying person details.
 * This component is extracted from PersonManager to ensure consistency
 * across different pages (PersonsPage, NotesPage, etc.)
 */

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ModalBase from "@/layouts/ModalBase";
import type { Person, PersonSummary } from "@/services/api";
import UnifiedTag from "./UnifiedTag";
import ActionButton from "./ActionButton";
import { ActionButtonGroup } from "./ActionButton";
import { FORM_LABEL_MUTED_CLASS } from "./forms/styles";

// Union type to support both PersonSummary and Person
type PersonDetail = PersonSummary | Person;

interface PersonDetailModalProps {
  person: PersonDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (person: PersonDetail) => void;
}

const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  person,
  isOpen,
  onClose,
  onEdit,
}) => {
  const { t } = useTranslation();
  const locationTags = useMemo(
    () => person?.tags?.filter((tag) => tag.category === "location") ?? [],
    [person],
  );
  const relationshipTags = useMemo(
    () => person?.tags?.filter((tag) => tag.category !== "location") ?? [],
    [person],
  );

  if (!isOpen || !person) return null;

  const handleEditClick = () => {
    onClose();
    onEdit(person);
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="person-detail-modal-title"
      size="lg"
      title={person.display_name || person.name || `Person #${person.id}`}
      footer={
        <ActionButtonGroup splitOpposite gap="sm" align="end">
          <ActionButton
            label={t("common.close")}
            iconName="x-mark"
            color="neutral"
            variant="ghost"
            onClick={onClose}
          />
          <ActionButton
            label={t("common.edit")}
            iconName="edit"
            color="primary"
            onClick={handleEditClick}
          />
        </ActionButtonGroup>
      }
      loading={false}
      showLoadingOverlay={false}
      showCloseButton={true}
    >
      <div className="space-y-4">
        {person.name && (
          <div>
            <label className={FORM_LABEL_MUTED_CLASS}>
              {t("personDetail.name")}
            </label>
            <p className="text-sm">{person.name}</p>
          </div>
        )}

        {/* Show nicknames for Person type or primary_nickname for PersonSummary */}
        {"nicknames" in person &&
          person.nicknames &&
          person.nicknames.length > 0 && (
            <div>
              <label className={FORM_LABEL_MUTED_CLASS}>
                {t("personDetail.nicknames")}
              </label>
              <div className="flex flex-wrap gap-1 mt-1">
                {person.nicknames.map((nickname: string, index: number) => (
                  <UnifiedTag key={index} type="nickname" size="md">
                    {nickname}
                  </UnifiedTag>
                ))}
              </div>
            </div>
          )}

        {/* Show primary nickname for PersonSummary type */}
        {"primary_nickname" in person && person.primary_nickname && (
          <div>
            <label className={FORM_LABEL_MUTED_CLASS}>
              {t("personDetail.primaryNickname")}
            </label>
            <div className="mt-1">
              <UnifiedTag type="nickname" size="md">
                {person.primary_nickname}
              </UnifiedTag>
            </div>
          </div>
        )}

        {person.birth_date && (
          <div>
            <label className={FORM_LABEL_MUTED_CLASS}>
              {t("personDetail.birthDate")}
            </label>
            <p className="text-sm">{person.birth_date}</p>
          </div>
        )}

        {(locationTags.length > 0 || person.location) && (
          <div>
            <label className={FORM_LABEL_MUTED_CLASS}>
              {t("personDetail.location")}
            </label>
            <div className="flex flex-wrap gap-1 mt-1">
              {locationTags.length > 0
                ? locationTags.map((tag) => (
                    <UnifiedTag key={tag.id} type="location" size="md">
                      {tag.name}
                    </UnifiedTag>
                  ))
                : person.location && (
                    <UnifiedTag type="location" size="md">
                      {person.location}
                    </UnifiedTag>
                  )}
            </div>
          </div>
        )}

        {relationshipTags.length > 0 && (
          <div>
            <label className={FORM_LABEL_MUTED_CLASS}>
              {t("personDetail.relationshipTags")}
            </label>
            <div className="flex flex-wrap gap-1 mt-1">
              {relationshipTags.map((tag) => (
                <UnifiedTag key={tag.id} type="relationship" size="md">
                  {tag.name}
                </UnifiedTag>
              ))}
            </div>
          </div>
        )}

      </div>
    </ModalBase>
  );
};

export default PersonDetailModal;
