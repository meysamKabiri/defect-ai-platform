import { useMemo, useState } from 'react'
import { Copy, MailPlus, RefreshCw, Search, Trash2, UserMinus } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { DataTable } from '@/components/common/DataTable'
import { Input } from '@/components/common/Input'
import { Panel } from '@/components/common/Panel'
import { Spinner } from '@/components/common/Spinner'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  useGetWorkspaceInvitationsQuery,
  useGetWorkspaceMembersQuery,
  useInviteWorkspaceUserMutation,
  useRemoveMemberMutation,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
  useUpdateMemberRoleMutation,
} from '@/features/admin/api/adminApi'
import type { WorkspaceInvitation, WorkspaceMember } from '@/features/admin/types'
import { selectCurrentUser, selectCurrentWorkspace } from '@/features/auth/authSlice'
import type { WorkspaceRole } from '@/features/auth/types'
import { useAppSelector } from '@/app/hooks'

const workspaceRoles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'ENGINEER', 'VIEWER']

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function roleLabel(role: WorkspaceRole) {
  return role.toLowerCase().replace('_', ' ')
}

export function UsersPage() {
  const currentUser = useAppSelector(selectCurrentUser)
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const workspaceId = currentWorkspace?.id ?? ''
  const currentRole = currentWorkspace?.role
  const [search, setSearch] = useState('')
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'ENGINEER' as WorkspaceRole,
  })
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({})
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null)

  const { data: membersData, isFetching: membersFetching } = useGetWorkspaceMembersQuery(workspaceId, {
    skip: !workspaceId,
  })
  const { data: invitationsData, isFetching: invitationsFetching } = useGetWorkspaceInvitationsQuery(workspaceId, {
    skip: !workspaceId,
  })
  const [inviteUser, inviteState] = useInviteWorkspaceUserMutation()
  const [updateMemberRole] = useUpdateMemberRoleMutation()
  const [removeMember] = useRemoveMemberMutation()
  const [revokeInvitation] = useRevokeInvitationMutation()
  const [resendInvitation] = useResendInvitationMutation()

  const activeOwnerCount = useMemo(
    () =>
      (membersData?.items ?? []).filter(
        (member) => member.role === 'OWNER' && member.status === 'ACTIVE',
      ).length,
    [membersData?.items],
  )

  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return membersData?.items ?? []
    return (membersData?.items ?? []).filter((member) =>
      `${member.email} ${member.full_name ?? ''} ${member.role}`.toLowerCase().includes(needle),
    )
  }, [membersData?.items, search])

  const canManageMember = (member: WorkspaceMember) => {
    if (!currentRole || member.user_id === currentUser?.id) return false
    if (currentRole === 'OWNER') {
      return !(member.role === 'OWNER' && activeOwnerCount <= 1)
    }
    return member.role === 'ENGINEER' || member.role === 'VIEWER'
  }

  const allowedRolesForMember = (member: WorkspaceMember) => {
    if (currentRole === 'OWNER') return workspaceRoles
    if (member.role === 'ENGINEER' || member.role === 'VIEWER') return ['ENGINEER', 'VIEWER'] as WorkspaceRole[]
    return [member.role]
  }

  const handleInvite = async () => {
    const invitation = await inviteUser({
      workspaceId,
      email: inviteForm.email,
      role: inviteForm.role,
    }).unwrap()
    if (invitation.invite_url) {
      setInviteLinks((current) => ({ ...current, [invitation.id]: invitation.invite_url! }))
    }
    setInviteForm({ email: '', role: 'ENGINEER' })
  }

  const copyInviteLink = async (invitation: WorkspaceInvitation) => {
    let inviteUrl: string | null = inviteLinks[invitation.id] ?? invitation.invite_url ?? null
    if (!inviteUrl) {
      const resentInvitation = await resendInvitation({
        workspaceId,
        invitationId: invitation.id,
      }).unwrap()
      inviteUrl = resentInvitation.invite_url ?? null
      if (inviteUrl) {
        setInviteLinks((current) => ({ ...current, [invitation.id]: inviteUrl! }))
      }
    }
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopiedInvitationId(invitation.id)
    window.setTimeout(() => setCopiedInvitationId(null), 1600)
  }

  const memberColumns = [
    {
      key: 'member',
      header: 'Member',
      render: (member: WorkspaceMember) => (
        <div>
          <p className="font-semibold text-foreground">{member.email}</p>
          <p className="text-xs text-muted-foreground">{member.full_name ?? 'No name set'}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (member: WorkspaceMember) =>
        canManageMember(member) ? (
          <select
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm capitalize"
            onChange={(event) =>
              void updateMemberRole({
                workspaceId,
                userId: member.user_id,
                role: event.target.value as WorkspaceRole,
              })
            }
            value={member.role}
          >
            {allowedRolesForMember(member).map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        ) : (
        <StatusBadge tone={member.role === 'OWNER' ? 'primary' : 'default'}>
            {roleLabel(member.role)}
          </StatusBadge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (member: WorkspaceMember) => (
        <StatusBadge tone={member.status === 'ACTIVE' ? 'success' : 'danger'}>
          {member.status.toLowerCase()}
        </StatusBadge>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (member: WorkspaceMember) => (
        <span className="text-sm text-muted-foreground">{formatDate(member.joined_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (member: WorkspaceMember) => (
        <Button
          disabled={!canManageMember(member)}
          leftIcon={<UserMinus className="size-4" aria-hidden="true" />}
          onClick={() => void removeMember({ workspaceId, userId: member.user_id })}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      ),
    },
  ]

  const invitationColumns = [
    {
      key: 'email',
      header: 'Invitation',
      render: (invitation: WorkspaceInvitation) => (
        <div>
          <p className="font-semibold text-foreground">{invitation.email}</p>
          <p className="text-xs text-muted-foreground">Expires {formatDate(invitation.expires_at)}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (invitation: WorkspaceInvitation) => (
        <StatusBadge tone="default">{roleLabel(invitation.role)}</StatusBadge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (invitation: WorkspaceInvitation) => (
        <StatusBadge tone={invitation.status === 'PENDING' ? 'warning' : 'default'}>
          {invitation.status.toLowerCase()}
        </StatusBadge>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (invitation: WorkspaceInvitation) => (
        <span className="text-sm text-muted-foreground">{formatDate(invitation.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (invitation: WorkspaceInvitation) => (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={invitation.status !== 'PENDING'}
            leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            onClick={async () => {
              const resentInvitation = await resendInvitation({ workspaceId, invitationId: invitation.id }).unwrap()
              if (resentInvitation.invite_url) {
                setInviteLinks((current) => ({ ...current, [invitation.id]: resentInvitation.invite_url! }))
              }
            }}
            size="sm"
            variant="secondary"
          >
            Resend
          </Button>
          <Button
            disabled={invitation.status !== 'PENDING'}
            leftIcon={<Copy className="size-4" aria-hidden="true" />}
            onClick={() => void copyInviteLink(invitation)}
            size="sm"
            variant="secondary"
          >
            {copiedInvitationId === invitation.id ? 'Copied' : inviteLinks[invitation.id] || invitation.invite_url ? 'Copy' : 'Resend & copy'}
          </Button>
          <Button
            disabled={invitation.status !== 'PENDING'}
            leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
            onClick={() => void revokeInvitation({ workspaceId, invitationId: invitation.id })}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-5">
      <Panel
        description="Manage workspace access through active memberships and single-use invitations."
        eyebrow="Workspace administration"
        title="Users"
      >
        <div className="grid gap-4 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_auto]">
            <Input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter members"
              value={search}
            />
            <Input
              onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="engineer@company.com"
              type="email"
              value={inviteForm.email}
            />
            <select
              className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
              onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value as WorkspaceRole }))}
              value={inviteForm.role}
            >
              {(currentRole === 'OWNER' ? workspaceRoles.filter((role) => role !== 'OWNER') : (['ENGINEER', 'VIEWER'] as WorkspaceRole[])).map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            <Button
              disabled={!workspaceId || !inviteForm.email}
              isLoading={inviteState.isLoading}
              leftIcon={<MailPlus className="size-4" aria-hidden="true" />}
              onClick={() => void handleInvite()}
            >
              Invite
            </Button>
          </div>
        </div>
      </Panel>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Search className="size-4" aria-hidden="true" />
        {filteredMembers.length} members
        {(membersFetching || invitationsFetching) && <Spinner className="size-4" />}
      </div>

      <Panel eyebrow="Members" title="Workspace members">
        <DataTable columns={memberColumns} rows={filteredMembers} />
      </Panel>

      <Panel eyebrow="Invitations" title="Pending and historical invitations">
        <DataTable columns={invitationColumns} rows={invitationsData?.items ?? []} />
      </Panel>
    </div>
  )
}
