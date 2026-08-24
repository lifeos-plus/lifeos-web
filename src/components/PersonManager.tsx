import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./icons";
import ActionButton, { EditButton, DeleteButton } from "./ActionButton";
import { ActionButtonGroup } from "./ActionButton";
import { personsApi } from "@/services/api/persons";
import PersonFormModal from "./PersonFormModal";
import PersonDetailModal from "./PersonDetailModal";
import CreateNoteModal from "./CreateNoteModal";
import UnifiedTag from "./UnifiedTag";
import type { Person } from "@/services/api/persons";
import type { PersonSummary } from "@/services/api/types/common";
import type { Tag } from "@/services/api/tags";
import { usePersons } from "@/hooks/queries/usePersons";
import ConfirmDialog from "./ConfirmDialog";
import ListContainer from "@/layouts/ListContainer";
import { TextInput } from "./forms";
import type { UUID } from "@/types/primitive";

interface PersonManagerProps {
  filteredByTag?: boolean;
  selectedTagId?: UUID | null;
  onSearchQueryChange?: (query: string) => void;
  onTimelineRequest?: (person: PersonSummary) => void;
  createRequestSignal?: number;
}

const PERSON_ROW_CELL_HOVER_CLASS =
  "transition-colors group-hover:bg-primary/10 group-focus-within:bg-primary/10";

const PersonManager: React.FC<PersonManagerProps> = ({
  filteredByTag = false,
  selectedTagId = null,
  onSearchQueryChange,
  onTimelineRequest,
  createRequestSignal,
}) => {
  const { t } = useTranslation();

  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [notePerson, setNotePerson] = useState<PersonSummary | null>(null);
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState<PersonSummary | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [sortField, setSortField] = useState<
    "name" | "nickname" | "location" | "birth_date" | "tags"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const getLocationTags = useCallback(
    (person: PersonSummary) =>
      person.tags?.filter((tag) => tag.category === "location") ?? [],
    [],
  );
  const getRelationshipTags = useCallback(
    (person: PersonSummary) =>
      person.tags?.filter((tag) => tag.category !== "location") ?? [],
    [],
  );
  const getTagCategoryDisplayName = useCallback(
    (category: string) => {
      const normalizedCategory = category || "general";
      const translated = t(`tagManager.categories.${normalizedCategory}`);
      return translated &&
        translated !== `tagManager.categories.${normalizedCategory}`
        ? translated
        : normalizedCategory;
    },
    [t],
  );

  // Refs for debouncing and IME handling
  const debounceTimer = useRef<number | null>(null);
  const isComposing = useRef(false);

  const personsFilters = React.useMemo(
    () => ({
      page: 1,
      size: 100,
      search: searchQuery || undefined,
      tagId: filteredByTag && selectedTagId ? selectedTagId : undefined,
    }),
    [searchQuery, filteredByTag, selectedTagId],
  );

  const {
    persons,
    total,
    isLoading,
    error: listError,
    refreshData,
    deletePerson,
    loadPersonActivities,
  } = usePersons(personsFilters);

  const combinedError = actionError || listError?.message || null;

  const debouncedSearch = useCallback(
    (value: string) => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }

      // Don't search if we're in the middle of IME composition
      if (isComposing.current) {
        return;
      }

      debounceTimer.current = window.setTimeout(() => {
        setSearchQuery(value.trim());
        onSearchQueryChange?.(value.trim());
      }, 300); // 300ms delay for better responsiveness
    },
    [onSearchQueryChange],
  );

  const lastCreateSignalRef = useRef<number | undefined>(createRequestSignal);
  useEffect(() => {
    if (
      createRequestSignal === undefined ||
      createRequestSignal === lastCreateSignalRef.current
    ) {
      return;
    }
    lastCreateSignalRef.current = createRequestSignal;
    handleCreateClick();
  }, [createRequestSignal]);

  const handleFormSuccess = (_result?: {
    updatedPerson?: Person;
    created?: boolean;
  }) => {
    refreshData();
    setEditingPerson(null);
  };

  const handleCreateClick = () => {
    setEditingPerson(null);
    setShowFormModal(true);
  };

  const handleEditClick = async (person: PersonSummary | Person) => {
    try {
      setActionError(null);
      // Always fetch the complete person data for editing
      const fullPerson = await personsApi.getById(person.id);
      setEditingPerson(fullPerson);
      setShowFormModal(true);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to load person for editing",
      );
    }
  };

  const handleDelete = (person: PersonSummary) => {
    setEditingPerson(null);
    setDeletingPerson(person);
  };

  const confirmDelete = () => {
    if (!deletingPerson) return;
    deletePerson(deletingPerson.id);
    setDeletingPerson(null);
  };

  const handlePersonSelect = async (person: PersonSummary) => {
    try {
      setActionError(null);
      const fullPerson = await personsApi.getById(person.id);
      setSelectedPerson(fullPerson);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to load person details",
      );
    }
  };

  const handleOpenCreateNote = useCallback((person: PersonSummary) => {
    setNotePerson(person);
    setIsCreateNoteModalOpen(true);
  }, []);

  const handleCloseCreateNote = useCallback(() => {
    setIsCreateNoteModalOpen(false);
    setNotePerson(null);
  }, []);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value); // Update input immediately for UI responsiveness
    debouncedSearch(value);
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLInputElement>,
  ) => {
    isComposing.current = false;
    // Trigger search immediately after composition ends
    const value = e.currentTarget.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedPersons = React.useMemo(() => {
    const sorted = [...persons].sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortField) {
        case "name":
          aValue = (a.display_name ?? a.name ?? "").toLowerCase();
          bValue = (b.display_name ?? b.name ?? "").toLowerCase();
          break;
        case "nickname":
          aValue = (a.primary_nickname ?? a.name ?? "").toLowerCase();
          bValue = (b.primary_nickname ?? b.name ?? "").toLowerCase();
          break;
        case "location": {
          const aLocation = getLocationTags(a)[0]?.name || a.location || "";
          const bLocation = getLocationTags(b)[0]?.name || b.location || "";
          aValue = aLocation.toLowerCase();
          bValue = bLocation.toLowerCase();
          break;
        }
        case "birth_date":
          aValue = a.birth_date || "";
          bValue = b.birth_date || "";
          break;
        case "tags":
          aValue = getRelationshipTags(a)
            .map(
              (tag: Tag) =>
                `${getTagCategoryDisplayName(tag.category || "general")}-${tag.name}`,
            )
            .join(", ")
            .toLowerCase();
          bValue = getRelationshipTags(b)
            .map(
              (tag: Tag) =>
                `${getTagCategoryDisplayName(tag.category || "general")}-${tag.name}`,
            )
            .join(", ")
            .toLowerCase();
          break;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? aValue < bValue
          ? -1
          : aValue > bValue
            ? 1
            : 0
        : bValue < aValue
          ? -1
          : bValue > aValue
            ? 1
            : 0;
    });

    return sorted;
  }, [
    getLocationTags,
    getRelationshipTags,
    getTagCategoryDisplayName,
    persons,
    sortField,
    sortDirection,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-hidden">
      {combinedError && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-md">
          {combinedError}
        </div>
      )}

      <ListContainer
        title={t("personManager.list", { count: total ?? persons.length })}
        headerAction={
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-base-content/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <TextInput
                id="person-search-input"
                name="person-search-input"
                type="text"
                placeholder={t("personManager.searchPlaceholder")}
                value={searchInput}
                onChange={handleSearchInputChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                className="w-full pl-10 text-base sm:w-64"
              />
            </div>
            <ActionButton
              label={t("common.add")}
              color="primary"
              onClick={handleCreateClick}
            />
          </div>
        }
        emptyState={
          <div className="p-8 text-center text-sm text-base-content/60">
            {t("personManager.noContacts")}
          </div>
        }
      >
        <div className="px-6 py-4">
          <div
            className="grid gap-0 bg-primary/10 border border-primary/20 rounded-md px-4 py-2 mb-2"
            style={{ gridTemplateColumns: "200px 200px 200px 160px 1fr 180px" }}
          >
            <button
              onClick={() => handleSort("name")}
              className="text-left text-xs  uppercase tracking-wider flex items-center gap-1"
            >
              <span>{t("personDetail.name")}</span>
              {sortField === "name" && (
                <Icon
                  name="chevron-down"
                  size={16}
                  className={`${sortDirection === "asc" ? "" : "rotate-180"} w-4 h-4`}
                />
              )}
            </button>
            <button
              onClick={() => handleSort("nickname")}
              className="text-left text-xs  uppercase tracking-wider flex items-center gap-1"
            >
              <span>{t("personDetail.nicknames")}</span>
              {sortField === "nickname" && (
                <Icon
                  name="chevron-down"
                  size={16}
                  className={`${sortDirection === "asc" ? "" : "rotate-180"} w-4 h-4`}
                />
              )}
            </button>
            <button
              onClick={() => handleSort("location")}
              className="text-left text-xs  uppercase tracking-wider flex items-center gap-1"
            >
              <span>{t("personDetail.location")}</span>
              {sortField === "location" && (
                <Icon
                  name="chevron-down"
                  size={16}
                  className={`${sortDirection === "asc" ? "" : "rotate-180"} w-4 h-4`}
                />
              )}
            </button>
            <button
              onClick={() => handleSort("birth_date")}
              className="text-left text-xs  uppercase tracking-wider flex items-center gap-1"
            >
              <span>{t("personDetail.birthDate")}</span>
              {sortField === "birth_date" && (
                <Icon
                  name="chevron-down"
                  size={16}
                  className={`${sortDirection === "asc" ? "" : "rotate-180"} w-4 h-4`}
                />
              )}
            </button>
            <button
              onClick={() => handleSort("tags")}
              className="text-left text-xs  uppercase tracking-wider flex items-center gap-1"
            >
              <span>{t("personDetail.relationshipTags")}</span>
              {sortField === "tags" && (
                <Icon
                  name="chevron-down"
                  size={16}
                  className={`${sortDirection === "asc" ? "" : "rotate-180"} w-4 h-4`}
                />
              )}
            </button>
            <div className="text-right text-sm  uppercase tracking-wider flex items-center justify-end">
              {t("common.actions")}
            </div>
          </div>

          <div
            className="grid gap-y-2 gap-x-0"
            style={{ gridTemplateColumns: "200px 200px 200px 160px 1fr 180px" }}
          >
            {filteredAndSortedPersons.map((person) => {
              const locationTags = getLocationTags(person);
              const relationshipTags = getRelationshipTags(person);
              return (
                <div
                  key={person.id}
                  className="contents group cursor-pointer"
                  onClick={() => handlePersonSelect(person)}
                >
                  <div className={`px-4 py-3 border-b border-base-300 ${PERSON_ROW_CELL_HOVER_CLASS}`}>
                    <div className="text-base  text-base-content">
                      {person.display_name}
                    </div>
                  </div>
                  <div className={`px-4 py-3 border-b border-base-300 ${PERSON_ROW_CELL_HOVER_CLASS}`}>
                    {person.primary_nickname &&
                      person.primary_nickname.trim() &&
                      person.primary_nickname !== person.display_name && (
                        <div className="flex flex-wrap gap-1">
                          {person.primary_nickname
                            .split(", ")
                            .slice(0, 2)
                            .map((nickname: string, index: number) => (
                              <UnifiedTag key={index} type="nickname" size="sm">
                                {nickname}
                              </UnifiedTag>
                            ))}
                          {person.primary_nickname.split(", ").length > 2 && (
                            <UnifiedTag type="status" size="sm">
                              +{person.primary_nickname.split(", ").length - 2}
                            </UnifiedTag>
                          )}
                        </div>
                      )}
                  </div>
                  <div className={`px-4 py-3 border-b border-base-300 ${PERSON_ROW_CELL_HOVER_CLASS}`}>
                    {(locationTags.length > 0 || person.location) && (
                      <div className="flex flex-wrap gap-1">
                        {locationTags.length > 0
                          ? locationTags.slice(0, 2).map((tag) => (
                              <UnifiedTag
                                key={tag.id}
                                type="location"
                                size="sm"
                              >
                                {tag.name}
                              </UnifiedTag>
                            ))
                          : person.location && (
                              <UnifiedTag type="location" size="sm">
                                {person.location}
                              </UnifiedTag>
                            )}
                        {locationTags.length > 2 && (
                          <UnifiedTag type="status" size="sm">
                            +{locationTags.length - 2}
                          </UnifiedTag>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`px-4 py-3 border-b border-base-300 text-sm text-base-content whitespace-nowrap ${PERSON_ROW_CELL_HOVER_CLASS}`}>
                    {person.birth_date || ""}
                  </div>
                  <div className={`px-4 py-3 border-b border-base-300 ${PERSON_ROW_CELL_HOVER_CLASS}`}>
                    <div className="flex flex-wrap gap-1">
                      {relationshipTags.slice(0, 5).map((tag: Tag) => (
                        <UnifiedTag key={tag.id} type="relationship" size="sm">
                          {`${getTagCategoryDisplayName(tag.category || "general")}-${tag.name}`}
                        </UnifiedTag>
                      ))}
                      {relationshipTags.length > 5 && (
                        <UnifiedTag type="status" size="sm">
                          +{relationshipTags.length - 5}
                        </UnifiedTag>
                      )}
                    </div>
                  </div>
                  <div className={`px-4 py-3 border-b border-base-300 text-right ${PERSON_ROW_CELL_HOVER_CLASS}`}>
                    <ActionButtonGroup gap="sm" align="end">
                      <ActionButton
                        label={t("personManager.timeline")}
                        color="primary"
                        iconName="timer"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadPersonActivities(person.id);
                          onTimelineRequest?.(person);
                        }}
                      />
                      <ActionButton
                        label={t("common.add")}
                        iconName="document-plus"
                        color="primary"
                        iconOnly
                        ariaLabel={t("notes.actions.addNote")}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCreateNote(person);
                        }}
                      />
                      <EditButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(person);
                        }}
                      />
                      <DeleteButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(person);
                        }}
                      />
                    </ActionButtonGroup>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ListContainer>

      <PersonDetailModal
        person={selectedPerson}
        isOpen={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onEdit={handleEditClick}
      />

      <PersonFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={handleFormSuccess}
        editingPerson={editingPerson}
        onRequestDelete={handleDelete}
      />

      <CreateNoteModal
        isOpen={isCreateNoteModalOpen}
        onClose={handleCloseCreateNote}
        preSelectedPersonIds={notePerson ? [notePerson.id] : undefined}
      />

      {deletingPerson && (
        <ConfirmDialog
          isOpen={!!deletingPerson}
          title={t("areaManager.deleteConfirmTitle")}
          message={t("personManager.deleteConfirmMessage", {
            name: deletingPerson.display_name,
          })}
          confirmText={t("common.delete")}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingPerson(null)}
        />
      )}
    </div>
  );
};

export default PersonManager;
